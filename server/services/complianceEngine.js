const User = require('../models/User');
const Fine = require('../models/Fine');
const DriverDocument = require('../models/DriverDocument');
const RouteAnalysis = require('../models/RouteAnalysis');

/**
 * Calculates and updates all compliance-related scores for a given User.
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} - Mapped computed scores
 */
const recalculateUserComplianceScores = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // 1. Gather all required dependencies
    const fines = await Fine.find({ userId });
    const docs = await DriverDocument.find({ userId });
    const recentRoutes = await RouteAnalysis.find({ userId }).sort({ createdAt: -1 }).limit(1);

    // Dynamic checks for overdue fines
    const now = new Date();
    const pendingFines = fines.filter(f => f.status === 'Pending' && new Date(f.dueDate) >= now);
    const overdueFines = fines.filter(f => f.status === 'Overdue' || (f.status === 'Pending' && new Date(f.dueDate) < now));

    // Dynamic checks for documents
    const docMap = {};
    docs.forEach(d => {
      // Prioritize the newest document upload of each type if duplicates exist
      if (!docMap[d.documentType] || new Date(d.createdAt) > new Date(docMap[d.documentType].createdAt)) {
        docMap[d.documentType] = d;
      }
    });

    const requiredTypes = ['DL', 'RC', 'Insurance', 'PUC'];
    const activeDocs = {};
    
    requiredTypes.forEach(type => {
      const doc = docMap[type];
      if (!doc) {
        activeDocs[type] = 'Missing';
      } else {
        const exp = new Date(doc.expiryDate);
        if (exp < now) {
          activeDocs[type] = 'Expired';
        } else {
          const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
          if (diffDays <= 30) {
            activeDocs[type] = 'Expiring Soon';
          } else if (doc.status === 'Unusual Validity') {
            // Preserve advisory flag — date range warned by validation engine
            activeDocs[type] = 'Unusual Validity';
          } else {
            activeDocs[type] = 'Valid';
          }
        }
      }
    });

    // Update statuses in the database for actual documents if they transitioned in background
    for (const type of requiredTypes) {
      const doc = docMap[type];
      if (doc) {
        const currentCalculatedStatus = activeDocs[type] === 'Expiring Soon' ? 'Expiring Soon' : 
                                       activeDocs[type] === 'Expired' ? 'Expired' :
                                       activeDocs[type] === 'Unusual Validity' ? 'Unusual Validity' : 'Valid';
        if (doc.status !== currentCalculatedStatus) {
          doc.status = currentCalculatedStatus;
          await doc.save();
        }
      }
    }


    // ==========================================
    // 2. SCORE 1: COMPLIANCE SCORE (0 - 100)
    // ==========================================
    // Base is 100.
    // Deductions:
    // - Missing document: -15 each
    // - Expired document: -20 each
    // - Expiring Soon document: -5 each
    // - Unusual Validity document: -3 each (soft advisory flag)
    // - Pending fine: -10 each
    // - Overdue fine: -15 each
    let complianceScore = 100;
    
    requiredTypes.forEach(type => {
      const status = activeDocs[type];
      if (status === 'Missing') complianceScore -= 15;
      else if (status === 'Expired') complianceScore -= 20;
      else if (status === 'Expiring Soon') complianceScore -= 5;
      else if (status === 'Unusual Validity') complianceScore -= 3;
    });

    complianceScore -= pendingFines.length * 10;
    complianceScore -= overdueFines.length * 15;
    complianceScore = Math.max(0, Math.min(100, complianceScore));


    // ==========================================
    // 3. SCORE 2: TRAVEL READINESS SCORE (0 - 100)
    // ==========================================
    // Base is 100.
    // Deductions:
    // - Driving License (DL) missing/invalid: -30
    // - Insurance missing/invalid: -25
    // - Registration (RC) missing/invalid: -20
    // - PUC emissions missing/invalid: -15
    // - Any pending/overdue fines exists: -15
    // - Route risk High/Critical: -20
    let travelReadinessScore = 100;

    if (activeDocs['DL'] === 'Missing' || activeDocs['DL'] === 'Expired') travelReadinessScore -= 30;
    if (activeDocs['Insurance'] === 'Missing' || activeDocs['Insurance'] === 'Expired') travelReadinessScore -= 25;
    if (activeDocs['RC'] === 'Missing' || activeDocs['RC'] === 'Expired') travelReadinessScore -= 20;
    if (activeDocs['PUC'] === 'Missing' || activeDocs['PUC'] === 'Expired') travelReadinessScore -= 15;

    if (pendingFines.length > 0 || overdueFines.length > 0) {
      travelReadinessScore -= 15;
    }

    // Check if dynamic route risk is high (last analyzed route score <= 60)
    if (recentRoutes.length > 0 && recentRoutes[0].safetyScore <= 60) {
      travelReadinessScore -= 20;
    }

    travelReadinessScore = Math.max(0, Math.min(100, travelReadinessScore));

    // ==========================================
    // 4. SCORE 3: VIOLATION RISK SCORE (0 - 100)
    // ==========================================
    // Predictive index measuring penalty exposure
    // Base is 10.
    // Additions:
    // - Unpaid fines: +15 each
    // - Overdue fines: +25 each
    // - Missing documents: +20 each
    // - Expired documents: +20 each
    // - Expiring Soon documents: +5 each
    // - Low recent route safety score: +15
    let violationRiskScore = 10;

    violationRiskScore += pendingFines.length * 15;
    violationRiskScore += overdueFines.length * 25;

    requiredTypes.forEach(type => {
      const status = activeDocs[type];
      if (status === 'Missing') violationRiskScore += 20;
      else if (status === 'Expired') violationRiskScore += 20;
      else if (status === 'Expiring Soon') violationRiskScore += 5;
      else if (status === 'Unusual Validity') violationRiskScore += 5; // Advisory — date may be incorrect
    });

    if (recentRoutes.length > 0 && recentRoutes[0].safetyScore <= 60) {
      violationRiskScore += 15;
    }

    // Violation Risk constraint: if no pending/overdue fines and no expired/missing documents, risk cannot exceed LOW (< 30)
    const hasChallans = pendingFines.length > 0 || overdueFines.length > 0;
    const hasExpiredDocs = requiredTypes.some(type => activeDocs[type] === 'Expired');
    const hasMissingDocs = requiredTypes.some(type => activeDocs[type] === 'Missing');

    if (!hasChallans && !hasExpiredDocs && !hasMissingDocs) {
      violationRiskScore = Math.min(29, violationRiskScore);
    }

    violationRiskScore = Math.max(0, Math.min(100, violationRiskScore));

    // ==========================================
    // 5. SCORE 4: AWARENESS SCORE (0 - 100)
    // ==========================================
    // Accumulates safety knowledge milestones
    // Points:
    // - Viewed learning modules: +10 pts each (max 40)
    // - AI learning sessions: +5 pts each (max 20)
    // - Route analyses completed: +10 pts each (max 20)
    // - Reports generated: +10 pts each (max 20)
    let awarenessScore = 0;

    const modulesCount = user.learningModulesViewed ? user.learningModulesViewed.length : 0;
    const chatCount = user.trafficAssistantChatsCount || 0;
    // Use full route count (not the limited recentRoutes query) for an accurate awareness signal
    const routesCount = await RouteAnalysis.countDocuments({ userId });
    const MonthlyReport = require('../models/MonthlyReport');
    const reportsCount = await MonthlyReport.countDocuments({ userId });

    awarenessScore += Math.min(40, modulesCount * 10);
    awarenessScore += Math.min(20, chatCount * 5);
    awarenessScore += Math.min(20, routesCount * 10);
    awarenessScore += Math.min(20, reportsCount * 10);

    awarenessScore = Math.max(0, Math.min(100, awarenessScore));

    // ==========================================
    // 5.5 Construct Compliance Score Explanation Contributors
    // ==========================================
    const contributors = [];
    requiredTypes.forEach(type => {
      const status = activeDocs[type];
      const name = type === 'DL' ? 'Driving License (DL)' :
                   type === 'RC' ? 'Registration Certificate (RC)' :
                   type === 'Insurance' ? 'Car Insurance' : 'PUC Certificate';
      if (status === 'Missing') {
        contributors.push(`${name} is missing`);
      } else if (status === 'Expired') {
        contributors.push(`${name} has expired`);
      } else if (status === 'Expiring Soon') {
        contributors.push(`${name} is expiring soon`);
      } else if (status === 'Unusual Validity') {
        contributors.push(`${name} has unusual validity`);
      }
    });

    if (pendingFines.length > 0) {
      contributors.push(`${pendingFines.length} pending challan(s) detected`);
    }
    if (overdueFines.length > 0) {
      contributors.push(`${overdueFines.length} overdue challan(s) detected`);
    }

    if (contributors.length === 0) {
      contributors.push("All documents valid & no pending challans");
    }

    // ==========================================
    // 6. Save back to Mongoose Model
    // ==========================================
    user.complianceScore = complianceScore;
    user.complianceContributors = contributors;
    user.travelReadinessScore = travelReadinessScore;
    user.violationRiskScore = violationRiskScore;
    user.awarenessScore = awarenessScore;
    await user.save();

    console.log(`[COMPLIANCE CALCULATOR] Recalculated for User ${userId}: Compliance=${complianceScore}, TravelReadiness=${travelReadinessScore}, ViolationRisk=${violationRiskScore}, Awareness=${awarenessScore}`);

    return {
      complianceScore,
      complianceContributors: contributors,
      travelReadinessScore,
      violationRiskScore,
      awarenessScore,
      documentStatus: activeDocs,
      learningModulesCount: modulesCount,
      learningModulesViewed: user.learningModulesViewed || [],
      aiChatsCount: chatCount,
      routesCount,
      reportsCount
    };

  } catch (error) {
    console.error(`[COMPLIANCE ENGINE ERROR] Recalculate failed for ${userId}:`, error.message);
    throw error;
  }
};

module.exports = {
  recalculateUserComplianceScores
};
