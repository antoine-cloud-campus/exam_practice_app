import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import TaskForm from "../components/TaskForm";

/**
 * Authenticated user's task list page.
 *
 * Loads the current user's tasks from `GET /api/tasks` on mount (the auth
 * cookie is sent automatically); if the request fails - typically a 401
 * because there is no valid session - the user is redirected to `/login`
 * instead of seeing an empty/broken page.
 */
const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await api.get("/tasks");
        setTasks(res.data);
      } catch (err) {
        navigate("/login");
      }
    };
    fetchTasks();
  }, [navigate]);

  const addTask = (task) => {
    setTasks([task, ...tasks]);
  };

  const deleteTask = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter((task) => task._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container">
      <h1>Mes Tâches</h1>
      <TaskForm addTask={addTask} />
      <ul className="task-list">
        {tasks.map((task) => (
          <li
            key={task._id}
            className={`task-item ${task.isCompleted ? "completed" : ""}`}
          >
            <span>{task.title}</span>
            <button onClick={() => deleteTask(task._id)}>Supprimer</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Tasks;
