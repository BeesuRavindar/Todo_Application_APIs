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

const convertDbObjectToResponseObject = (eachTodo) => {
  return {
    id: eachTodo.id,
    todo: eachTodo.todo,
    priority: eachTodo.priority,
    status: eachTodo.status,
    category: eachTodo.category,
    dueDate: eachTodo.due_date,
  };
};

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
                status = '${status}'
                AND priority = '${priority}';`;
        data = await db.all(getTodosQuery);
        response.send(
          data.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
        );
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
                category = '${category}'
                AND priority = '${priority}';`;
        data = await db.all(getTodosQuery);
        response.send(
          data.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
        );
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
                priority = '${priority}';`;
        data = await db.all(getTodosQuery);
        response.send(
          data.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
        );
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
                status = '${status}';`;
        data = await db.all(getTodosQuery);
        response.send(
          data.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
        );
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
                category = '${category}';`;
        data = await db.all(getTodosQuery);
        response.send(
          data.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
        );
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
                status = '${status}'
                AND category = '${category}';`;
        data = await db.all(getTodosQuery);
        response.send(
          data.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
        );
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
      data = await db.all(getTodosQuery);
      response.send(
        data.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
      );
      break;
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT * FROM todo WHERE id = ${todoId};
    `;
  const dbTodo = await db.get(getTodoQuery);
  response.send(convertDbObjectToResponseObject(dbTodo));
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

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (date === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const formattedDate = format(new Date(date), "yyyy-MM-dd");
    const isValidDate = isValid(new Date(formattedDate));
    if (isValidDate) {
      const getTodosQuery = `
      SELECT * FROM todo WHERE due_date = '${formattedDate}';
      `;
      const todosData = await db.all(getTodosQuery);
      response.send(
        todosData.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
      );
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const isValidCategory =
    category === "WORK" || category === "HOME" || category === "LEARNING";
  const isValidPriority =
    priority === "HIGH" || priority === "LOW" || priority === "MEDIUM";
  const isValidStatus =
    status === "TO DO" || status === "DONE" || status === "IN PROGRESS";
  const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
  const isValidDate = isValid(new Date(formattedDate));

  switch (true) {
    case !isValidPriority:
      response.status(400);
      response.send("Invalid Todo Priority");
      break;
    case !isValidStatus:
      response.status(400);
      response.send("Invalid Todo Status");
      break;
    case !isValidCategory:
      response.status(400);
      response.send("Invalid Todo Category");
      break;
    case !isValidDate:
      response.status(400);
      response.send("Invalid Due Date");
      break;

    default:
      const addTodoQuery = `
        INSERT INTO todo(id, todo, category, priority, status, due_date)
        VALUES (${id}, '${todo}', '${category}', '${priority}', '${status}', '${formattedDate}');
        `;
      await db.run(addTodoQuery);
      response.send("Todo Successfully Added");
      break;
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;

  const isValidCategory =
    category === "WORK" || category === "HOME" || category === "LEARNING";
  const isValidPriority =
    priority === "HIGH" || priority === "LOW" || priority === "MEDIUM";
  const isValidStatus =
    status === "TO DO" || status === "DONE" || status === "IN PROGRESS";

  switch (true) {
    case status !== undefined:
      if (isValidStatus) {
        const updateTodoQuery = `
            UPDATE todo
            SET status = '${status}'
            WHERE id = ${todoId};
            `;
        await db.run(updateTodoQuery);
        response.send("Status Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case priority !== undefined:
      if (isValidPriority) {
        const updateTodoQuery = `
            UPDATE todo
            SET priority = '${priority}'
            WHERE id = ${todoId};
            `;
        await db.run(updateTodoQuery);
        response.send("Priority Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case category !== undefined:
      if (isValidCategory) {
        const updateTodoQuery = `
            UPDATE todo
            SET category = '${category}'
            WHERE id = ${todoId};
            `;
        await db.run(updateTodoQuery);
        response.send("Category Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case dueDate !== undefined:
      const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
      const isValidDate = isValid(new Date(formattedDate));

      if (isValidDate) {
        const updateTodoQuery = `
            UPDATE todo
            SET due_date = '${formattedDate}'
            WHERE id = ${todoId};
            `;
        await db.run(updateTodoQuery);
        response.send("Due Date Updated");
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
    default:
      const updateTodoQuery = `
        UPDATE todo
        SET todo = '${todo}'
        WHERE id = ${todoId};
        `;
      await db.run(updateTodoQuery);
      response.send("Todo Updated");
      break;
  }
});

module.exports = app;
