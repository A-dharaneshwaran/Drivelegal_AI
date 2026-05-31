const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// 1. Fetch, Search, Filter, Paginate Notifications
router.get('/', auth, async (req, res) => {
  try {
    const { isRead, type, priority, sortBy, search, page = 1, limit = 10 } = req.query;
    const query = { userId: req.userId };

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }
    if (type) {
      query.type = type;
    }
    if (priority) {
      query.priority = priority;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'priority') {
      // Custom weight logic or standard high-to-low ordering
      sortOptions = { priority: 1, createdAt: -1 };
    } else if (sortBy === 'unread') {
      sortOptions = { isRead: 1, createdAt: -1 };
    }

    const skipIndex = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    const notifications = await Notification.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit, 10))
      .skip(skipIndex);

    const totalCount = await Notification.countDocuments(query);

    res.json({
      success: true,
      notifications,
      pagination: {
        totalCount,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(totalCount / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error("Notifications list failure:", error);
    res.status(500).json({ success: false, message: "Error fetching notifications ledger." });
  }
});

// 2. Fetch Unread count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.userId, isRead: false });
    res.json({ success: true, count });
  } catch (error) {
    console.error("Unread notifications count failure:", error);
    res.status(500).json({ success: false, message: "Error retrieving unread notifications count." });
  }
});

// 3. Mark individual as Read
router.put('/read/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification record not found." });
    }
    res.json({ success: true, notification });
  } catch (error) {
    console.error("Mark read notification failure:", error);
    res.status(500).json({ success: false, message: "Error marking alert as read." });
  }
});

// 4. Mark all as Read
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true, message: "All notifications successfully marked as read." });
  } catch (error) {
    console.error("Mark all read failure:", error);
    res.status(500).json({ success: false, message: "Error marking all alerts as read." });
  }
});

// 5. Delete individual alert
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification record not found." });
    }
    res.json({ success: true, message: "Notification successfully deleted." });
  } catch (error) {
    console.error("Delete notification failure:", error);
    res.status(500).json({ success: false, message: "Error deleting alert record." });
  }
});

module.exports = router;
