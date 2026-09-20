const { supabase } = require('../config/supabase');

/**
 * @route   GET /api/tasks
 * @desc    Fetch all tasks for the authenticated user with optional search, filter, and sort
 * @access  Private
 */
const getTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, priority, search, sort } = req.query;

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);

    // Apply status filter
    if (status && status !== 'All') {
      query = query.eq('status', status);
    }

    // Apply priority filter
    if (priority && priority !== 'All') {
      query = query.eq('priority', priority);
    }

    // Apply search filter (matching title or description)
    if (search && search.trim() !== '') {
      const term = search.trim();
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }

    // Apply sorting
    if (sort === 'dueDate' || sort === 'due_date') {
      query = query.order('due_date', { ascending: true });
    } else if (sort === 'priority') {
      query = query.order('priority', { ascending: false });
    } else {
      // Default: Recently created first
      query = query.order('created_at', { ascending: false });
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('[Supabase getTasks Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Could not retrieve tasks from database.'
      });
    }

    return res.status(200).json({
      success: true,
      count: tasks ? tasks.length : 0,
      tasks: tasks || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/tasks/stats/summary
 * @desc    Get dynamic live statistics aggregated from user tasks
 * @access  Private
 */
const getTaskStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('status, priority')
      .eq('user_id', userId);

    if (error) {
      console.error('[Supabase getTaskStats Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Could not calculate task statistics.'
      });
    }

    const allTasks = tasks || [];
    const total = allTasks.length;
    const pending = allTasks.filter((t) => t.status === 'Pending').length;
    const inProgress = allTasks.filter((t) => t.status === 'In Progress').length;
    const completed = allTasks.filter((t) => t.status === 'Completed').length;
    const highPriority = allTasks.filter((t) => t.priority === 'High').length;

    return res.status(200).json({
      success: true,
      stats: {
        total,
        pending,
        inProgress,
        completed,
        highPriority
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/tasks/:id
 * @desc    Fetch a single task by ID
 * @access  Private
 */
const getTaskById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or access unauthorized.'
      });
    }

    return res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private
 */
const createTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title, description, priority, status, dueDate, due_date } = req.body;

    // Validate title
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Task title is required.'
      });
    }

    // Validate due date
    const targetDueDate = dueDate || due_date;
    if (!targetDueDate) {
      return res.status(400).json({
        success: false,
        message: 'Due date is required.'
      });
    }

    // Validate priority enum
    const validPriorities = ['Low', 'Medium', 'High'];
    const chosenPriority = validPriorities.includes(priority) ? priority : 'Medium';

    // Validate status enum
    const validStatuses = ['Pending', 'In Progress', 'Completed'];
    const chosenStatus = validStatuses.includes(status) ? status : 'Pending';

    const newTaskRecord = {
      user_id: userId,
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: chosenPriority,
      status: chosenStatus,
      due_date: new Date(targetDueDate).toISOString()
    };

    const { data: createdTask, error } = await supabase
      .from('tasks')
      .insert(newTaskRecord);

    if (error) {
      console.error('[Supabase createTask Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create task. Please verify your inputs.'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      task: createdTask || newTaskRecord
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task details (title, description, priority, status, due date)
 * @access  Private
 */
const updateTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, description, priority, status, dueDate, due_date } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Task title cannot be empty.'
      });
    }

    const updates = {
      title: title.trim(),
      ...(description !== undefined && { description: description.trim() }),
      ...(priority && { priority }),
      ...(status && { status }),
      ...((dueDate || due_date) && { due_date: new Date(dueDate || due_date).toISOString() })
    };

    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[Supabase updateTask Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update task.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      task: updatedTask
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Quickly update task status (Pending / In Progress / Completed)
 * @access  Private
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'In Progress', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Permitted values: Pending, In Progress, Completed.'
      });
    }

    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('[Supabase updateTaskStatus Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Could not update status.'
      });
    }

    return res.status(200).json({
      success: true,
      message: status === 'Completed' ? 'Task marked as completed.' : `Task moved to ${status}.`,
      task: updatedTask
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Permanently delete a task
 * @access  Private
 */
const deleteTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Supabase deleteTask Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete task.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask
};
