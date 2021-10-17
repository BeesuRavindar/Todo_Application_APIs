const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const isValid = require("date-fns/isValid");
const format = require("date-fns/format");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityAndCategoryProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.category !== undefined
  );
};

const hasTodoProperty = (requestQuery) => {
  return requestQuery.search_q !== undefined;
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";

  const { search_q = "", category, priority, status } = request.query;

  const isValidCategory =
    category === "WORK" || category === "HOME" || category === "LEARNING";
  const isValidPriority =
    priority === "HIGH" || priority === "LOW" || priority === "MEDIUM";
  const isValidStatus =
    status === "TO DO" || status === "DONE" || status === "IN PROGRESS";

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      if (isValidPriority && isValidStatus) {
        getTodosQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND status = '${status}'
                AND priority = '${priority}';`;
      } else {
        if (isValidPriority) {
          response.status(400);
          response.send("Invalid Todo Status");
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      }
      break;

    case hasPriorityAndCategoryProperties(request.query):
      if (isValidPriority && isValidCategory) {
        getTodosQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND category = '${category}'
                AND priority = '${priority}';`;
      } else {
        if (isValidPriority) {
          response.status(400);
          response.send("Invalid Todo Category");
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      }
      break;

    case hasPriorityProperty(request.query):
      if (isValidPriority) {
        getTodosQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND priority = '${priority}';`;
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    case hasStatusProperty(request.query):
      if (isValidStatus) {
        getTodosQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND status = '${status}';`;
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;

    case hasCategoryProperty(request.query):
      if (isValidCategory) {
        getTodosQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND category = '${category}';`;
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    case hasCategoryAndStatusProperties(request.query):
      if (isValidCategory && isValidStatus) {
        getTodosQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND status = '${status}'
                AND category = '${category}';`;
      } else {
        if (isValidCategory) {
          response.status(400);
          response.send("Invalid Todo Status");
        } else {
          response.status(400);
          response.send("Invalid Todo Category");
        }
      }
      break;

    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
      break;
  }

  data = await db.all(getTodosQuery);
  response.send(data);
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT * FROM todo WHERE id = ${todoId};
    `;
  const dbTodo = await db.get(getTodoQuery);
  response.send({
    id: dbTodo.id,
    todo: dbTodo.todo,
    priority: dbTodo.priority,
    status: dbTodo.status,
    category: dbTodo.category,
    dueDate: dbTodo.due_date,
  });
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const isValidDate = isValid(new Date(date));
  const formattedDate = format(date, "yyyy-MM-dd");
  if (isValidDate) {
    const getTodosQuery = `
        SELECT * FROM todo WHERE due_date = '${formattedDate}';
    `;
    const dbTodos = await db.all(getTodosQuery);
    response.send(dbTodos);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { todo, priority, status, category, dueDate } = request.body;
  switch (true) {
    case !(status === "TO DO" || status === "DONE" || status === "IN PROGRESS"):
      response.status(400);
      response.send("Invalid Todo Status");
      break;
    case !(priority === "HIGH" || priority === "LOW" || priority === "MEDIUM"):
      response.status(400);
      response.send("Invalid Todo Priority");
      break;
    case !(
      category === "WORK" ||
      category === "HOME" ||
      category === "LEARNING"
    ):
      response.status(400);
      response.send("Invalid Todo Category");
      break;
    case !isValid(new Date(dueDate)):
      response.status(400);
      response.send("Invalid Due Date");
      break;
    default:
      const addTodoQuery = `
            INSERT INTO todo(todo, category, priority, status, due_date)
            VALUES(
                todo = '${todo}',
                category = '${category}',
                priority = '${priority}',
                status = '${status}',
                due_date = '${dueDate}'
            );
            `;
      await db.run(addTodoQuery);
      response.send("Todo Successfully Added");
      break;
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    category = previousTodo.category,
    priority = previousTodo.priority,
    status = previousTodo.status,
    dueDate = previousTodo.due_date,
  } = request.body;

  const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      category = '${category}'
      priority='${priority}',
      status='${status}'
      due_date = '${dueDate}'
    WHERE
      id = ${todoId};`;

  await db.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id = ${todoId};
    `;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
