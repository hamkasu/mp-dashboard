/**
 * Script to create an admin user
 * This script creates a default admin user if none exists
 * Usage: npm run create-admin-user
 * Or set environment variables: ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_DISPLAY_NAME, ADMIN_EMAIL
 */

import { db } from "../server/db";
import { adminUsers } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createInterface } from "readline";

async function promptForInput(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function createAdminUser() {
  try {
    console.log("Creating admin user...\n");

    // Check if any admin users exist
    const existingUsers = await db.select().from(adminUsers);

    if (existingUsers.length > 0) {
      console.log("⚠️  Admin users already exist:");
      existingUsers.forEach(user => {
        console.log(`   - ${user.username} (${user.displayName})`);
      });

      const proceed = await promptForInput("\nDo you want to create another admin user? (yes/no): ");
      if (proceed.toLowerCase() !== "yes" && proceed.toLowerCase() !== "y") {
        console.log("Cancelled.");
        process.exit(0);
      }
    }

    // Get admin user details from environment variables or prompt
    let username = process.env.ADMIN_USERNAME;
    let password = process.env.ADMIN_PASSWORD;
    let displayName = process.env.ADMIN_DISPLAY_NAME;
    let email = process.env.ADMIN_EMAIL;

    if (!username) {
      username = await promptForInput("Enter username: ");
    }

    if (!password) {
      password = await promptForInput("Enter password: ");
    }

    if (!displayName) {
      displayName = await promptForInput("Enter display name: ");
    }

    if (!email) {
      email = await promptForInput("Enter email (optional): ");
    }

    // Validate inputs
    if (!username || !password || !displayName) {
      console.error("❌ Username, password, and display name are required");
      process.exit(1);
    }

    // Check if username already exists
    const [existingUser] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username));

    if (existingUser) {
      console.error(`❌ User with username "${username}" already exists`);
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db
      .insert(adminUsers)
      .values({
        username,
        passwordHash,
        displayName,
        email: email || null,
        isActive: true,
      })
      .returning();

    console.log("\n✅ Admin user created successfully!");
    console.log(`   Username: ${newUser.username}`);
    console.log(`   Display Name: ${newUser.displayName}`);
    if (newUser.email) {
      console.log(`   Email: ${newUser.email}`);
    }
    console.log(`\nYou can now log in with username: ${newUser.username}`);
  } catch (error: any) {
    console.error("❌ Error creating admin user:", error.message);
    process.exit(1);
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
