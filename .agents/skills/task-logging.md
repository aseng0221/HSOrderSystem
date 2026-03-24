# Skill: Dynamic Task Logging Protocol

## 1. Storage Configuration

- **Local Path:** `.logs/tasks/` (Ensure this directory exists before saving).
- **Filename Format:** `YYYYMMDD_HHmm_[Task_Name].md`
  - Example: `20260312_1030_FixNavigationBug.md`

## 2. Dynamic Content Template

---

# Task Log: {{TASK_NAME}}

- **Timestamp:** {{CURRENT_DATETIME}}
- **Agent:** Senior React Native Developer & Automation Architect
- **Project:** {{PROJECT_NAME}}

---

## 3. Archiving Logic

- **Step 1:** Generate the Markdown content based on the task outcome.
- **Step 2:** Save locally to the specified **Local Path** with the **Filename Format**.
- **Step 3:** Use the **Google Workspace Tool** to upload the exact same file to your Google Drive "Heng-Seng Dev Logs" folder.
