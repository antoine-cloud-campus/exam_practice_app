const express = require('express');
const router = express.Router();
const Joi = require('joi');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const logger = require('../config/logger');

const createTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).allow('').optional(),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  description: Joi.string().max(1000).allow(''),
  isCompleted: Joi.boolean(),
});

// @route   GET api/tasks
// @desc    Get all user tasks
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    logger.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/tasks
// @desc    Add a new task
router.post('/', auth, async (req, res) => {
  const { error } = createTaskSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ msg: error.details[0].message });
  }

  const { title, description } = req.body;

  try {
    const newTask = new Task({
      title,
      description,
      user: req.user.id,
    });

    const task = await newTask.save();
    res.json(task);
  } catch (err) {
    logger.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/tasks/:id
// @desc    Update a task
router.put('/:id', auth, async (req, res) => {
  const { error } = updateTaskSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ msg: error.details[0].message });
  }

  const { title, description, isCompleted } = req.body;

  try {
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    task = await Task.findByIdAndUpdate(req.params.id, { $set: { title, description, isCompleted } }, { new: true });

    res.json(task);
  } catch (err) {
    logger.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/tasks/:id
// @desc    Delete a task
router.delete('/:id', auth, async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Task removed' });
  } catch (err) {
    logger.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
