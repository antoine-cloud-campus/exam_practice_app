import React, { useState } from "react";
import api from "../api";

/**
 * Form to create a new task for the authenticated user.
 *
 * Submits the title to `POST /api/tasks` (auth cookie sent automatically)
 * and hands the created task back to the parent via `addTask` so it can
 * be prepended to the task list without a full page reload.
 *
 * @param {Object} props
 * @param {(task: Object) => void} props.addTask - Called with the newly created task document on success
 */
const TaskForm = ({ addTask }) => {
  const [title, setTitle] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/tasks", { title });
      addTask(res.data);
      setTitle("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-group">
      <input
        type="text"
        placeholder="Ajouter une tâche ..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button type="submit" className="btn" style={{ marginTop: "10px" }}>
        Ajouter Tâche
      </button>
    </form>
  );
};

export default TaskForm;
