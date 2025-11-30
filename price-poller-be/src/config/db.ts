// import { Pool } from "pg";

// const pool = new Pool({
//   user: process.env.DB_USER || "postgres",
//   host: process.env.DB_HOST || "localhost",
//   database: process.env.DB_NAME || "my_timescaledb",
//   password: process.env.DB_PASSWORD || "newpassword",
//   port: parseInt(process.env.DB_PORT || "5432"),
//   ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
//   max: 10,
//   min: 2,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 10000,
//   keepAlive: true,
//   keepAliveInitialDelayMillis: 10000,
//   statement_timeout: 30000,
//   query_timeout: 30000,
// });

// pool.on("error", (err) => {
//   console.error("Database pool error:", err);
// });

// pool.on("connect", () => {
//   console.log("Database connection established");
// });

// pool.query("SELECT NOW()", (err, res) => {
//   if (err) {
//     console.error("Database connection test failed:", err.message);
//   } else {
//     console.log("Database connected at:", res.rows[0].now);
//   }
// });

// export { pool };


// import { Pool } from "pg";

// const isNeon = process.env.DB_HOST?.includes('neon.tech');

// const pool = new Pool({
//   user: process.env.DB_USER || "postgres",
//   host: process.env.DB_HOST || "localhost",
//   database: process.env.DB_NAME || "my_timescaledb",
//   password: process.env.DB_PASSWORD || "newpassword",
//   port: parseInt(process.env.DB_PORT || "5432"),
//   ssl: process.env.DB_SSL === "true" 
//     ? { 
//         rejectUnauthorized: false,
//         // Neon requires these additional SSL options
//         ...(isNeon && { 
//           require: true,
//           ca: undefined 
//         })
//       } 
//     : false,
//   max: 10,
//   min: 2,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 10000,
//   keepAlive: true,
//   keepAliveInitialDelayMillis: 10000,
//   statement_timeout: 30000,
//   query_timeout: 30000,
// });

// pool.on("error", (err) => {
//   console.error("❌ Database pool error:", err);
// });

// pool.on("connect", () => {
//   console.log("✅ Database connection established");
// });

// // Test connection
// pool.query("SELECT NOW()", (err, res) => {
//   if (err) {
//     console.error("❌ Database connection test failed:", err.message);
//   } else {
//     console.log("✅ Database connected at:", res.rows[0].now);
//   }
// });

// export { pool };




import { Pool } from "pg";

const isNeon = process.env.DB_HOST?.includes('neon.tech');

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "my_timescaledb",
  password: process.env.DB_PASSWORD || "newpassword",
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: process.env.DB_SSL === "true" 
    ? { 
        rejectUnauthorized: false,
      } 
    : false,
  // Neon-specific connection settings
  max: isNeon ? 1 : 10, // Neon pooler works better with fewer connections
  min: 0, // Allow pool to be empty
  idleTimeoutMillis: isNeon ? 0 : 30000, // Don't keep idle connections with Neon
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: isNeon, // Allow the pool to close all connections and exit
});

pool.on("error", (err) => {
  console.error("❌ Database pool error:", err.message);
  // Don't exit on connection errors with Neon
});

pool.on("connect", (client) => {
  console.log("✅ Database connection established");
  
  // Set statement timeout on the client
  if (isNeon) {
    client.query('SET statement_timeout = 30000').catch(err => {
      console.error("Failed to set statement timeout:", err.message);
    });
  }
});

// Test connection with proper error handling
async function testConnection() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Database connected at:", res.rows[0].now);
  } catch (err: any) {
    console.error("❌ Database connection test failed:", err.message);
  }
}

// Run test after a small delay to allow pool to initialize
setTimeout(testConnection, 1000);

export { pool };