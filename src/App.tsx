import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Todo } from './types/Todo';
import * as todoService from './api/todos';

type Filter = 'all' | 'active' | 'completed';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [errorMessage, setErrorMessage] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 3000);
  };

  useEffect(() => {
    todoService
      .getTodos()
      .then(setTodos)
      .catch(() => showError('Unable to load todos'));
  }, []);

  useEffect(() => {
    if (!isAdding && editingId === null) {
      inputRef.current?.focus();
    }
  }, [todos.length, errorMessage, isAdding, editingId]);

  const completedTodos = useMemo(() => todos.filter(t => t.completed), [todos]);
  const activeCount = todos.length - completedTodos.length;

  const visibleTodos = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter(t => !t.completed);
      case 'completed':
        return todos.filter(t => t.completed);
      default:
        return todos;
    }
  }, [todos, filter]);

  const toggleTodo = (todo: Todo) => {
    setLoadingIds(prev => [...prev, todo.id]);

    todoService
      .updateTodo({
        ...todo,
        completed: !todo.completed,
      })
      .then(updated => {
        setTodos(prev => prev.map(t => (t.id === todo.id ? updated : t)));
      })
      .catch(() => showError('Unable to update a todo'))
      .finally(() => {
        setLoadingIds(prev => prev.filter(id => id !== todo.id));
      });
  };

  const removeTodo = (id: number) => {
    setLoadingIds(prev => [...prev, id]);

    todoService
      .deleteTodo(id)
      .then(() => {
        setTodos(prev => prev.filter(t => t.id !== id));
      })
      .catch(() => showError('Unable to delete a todo'))
      .finally(() => {
        setLoadingIds(prev => prev.filter(x => x !== id));
      });
  };

  const updateTitle = (todo: Todo) => {
    const trimmedTitle = editTitle.trim();

    if (trimmedTitle === todo.title) {
      setEditingId(null);

      return;
    }

    if (!trimmedTitle) {
      removeTodo(todo.id);

      return;
    }

    setLoadingIds(prev => [...prev, todo.id]);

    todoService
      .updateTodo({ ...todo, title: trimmedTitle })
      .then(updated => {
        setTodos(prev => prev.map(t => (t.id === todo.id ? updated : t)));
        setEditingId(null);
      })
      .catch(() => showError('Unable to update a todo'))
      .finally(() => {
        setLoadingIds(prev => prev.filter(id => id !== todo.id));
      });
  };

  const toggleAll = () => {
    const newStatus = activeCount > 0;

    todos.filter(t => t.completed !== newStatus).forEach(toggleTodo);
  };

  const clearCompleted = () => {
    completedTodos.forEach(todo => removeTodo(todo.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();

    if (!trimmed) {
      showError('Title should not be empty');

      return;
    }

    setIsAdding(true);

    todoService
      .createTodo({
        title: trimmed,
        completed: false,
        userId: todoService.USER_ID,
      })
      .then(created => {
        setTodos(prev => [...prev, created]);
        setNewTitle('');
      })
      .catch(() => showError('Unable to add a todo'))
      .finally(() => setIsAdding(false));
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length > 0 && (
            <button
              type="button"
              className={`todoapp__toggle-all ${activeCount === 0 ? 'active' : ''}`}
              data-cy="ToggleAllButton"
              onClick={toggleAll}
            />
          )}

          <form onSubmit={handleSubmit}>
            <input
              data-cy="NewTodoField"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              ref={inputRef}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              disabled={isAdding}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {visibleTodos.map(todo => {
            const isLoading = loadingIds.includes(todo.id);
            const isEditing = editingId === todo.id;

            return (
              <div
                key={todo.id}
                className={`todo ${todo.completed ? 'completed' : ''} ${isEditing ? 'editing' : ''}`}
                data-cy="Todo"
              >
                <label
                  className="todo__status-label"
                  htmlFor={`todo-status-${todo.id}`}
                >
                  Toggle status
                  <input
                    id={`todo-status-${todo.id}`}
                    type="checkbox"
                    className="todo__status"
                    data-cy="TodoStatus"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo)}
                  />
                </label>

                {isEditing ? (
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      updateTitle(todo);
                    }}
                  >
                    <input
                      autoFocus
                      data-cy="TodoTitleField"
                      className="todo__title-field"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => updateTitle(todo)}
                      onKeyUp={e => {
                        if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                    />
                  </form>
                ) : (
                  <>
                    <span
                      data-cy="TodoTitle"
                      className="todo__title"
                      onDoubleClick={() => {
                        setEditingId(todo.id);
                        setEditTitle(todo.title);
                      }}
                    >
                      {todo.title}
                    </span>
                    <button
                      type="button"
                      className="todo__remove"
                      data-cy="TodoDelete"
                      onClick={() => removeTodo(todo.id)}
                    >
                      ×
                    </button>
                  </>
                )}

                <div
                  data-cy="TodoLoader"
                  className={`modal overlay ${isLoading ? 'is-active' : ''}`}
                >
                  <div className="modal-background" />
                  <div className="loader" />
                </div>
              </div>
            );
          })}

          {isAdding && (
            <div className="todo" data-cy="Todo">
              <label
                className="todo__status-label"
                htmlFor="todo-status-adding"
              >
                Loading status
                <input
                  id="todo-status-adding"
                  type="checkbox"
                  className="todo__status"
                  disabled
                />
              </label>
              <span data-cy="TodoTitle" className="todo__title">
                {newTitle}
              </span>
              <div className="modal overlay is-active" data-cy="TodoLoader">
                <div className="modal-background" />
                <div className="loader" />
              </div>
            </div>
          )}
        </section>

        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span data-cy="TodosCounter">{activeCount} items left</span>

            <nav className="filter" data-cy="Filter">
              {(['all', 'active', 'completed'] as Filter[]).map(f => (
                <a
                  key={f}
                  href={`#/${f === 'all' ? '' : f}`}
                  data-cy={`FilterLink${f.charAt(0).toUpperCase() + f.slice(1)}`}
                  className={filter === f ? 'selected' : ''}
                  onClick={e => {
                    e.preventDefault();
                    setFilter(f);
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </a>
              ))}
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              onClick={clearCompleted}
              disabled={completedTodos.length === 0}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={`notification is-danger is-light ${!errorMessage ? 'hidden' : ''}`}
      >
        <button
          type="button"
          data-cy="HideErrorButton"
          className="delete"
          onClick={() => setErrorMessage('')}
        />
        {errorMessage}
      </div>
    </div>
  );
};
