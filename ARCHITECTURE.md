# Advanced Question Bank & Assessment Architecture Blueprint

## 1. System Overview & Core Objectives

The **exmb** platform is a high-performance, enterprise-grade assessment engine designed to simulate and manage high-stakes examinations (e.g., NEET, JEE). 
This underlying architecture focuses on deep metadata tagging, robust content rendering (LaTeX/KaTeX, integrated Cloud Storage for images), and rapid content ingestion via bulk CSV/JSON uploading. The system supports a comprehensive Admin Control Center for taxonomy management, question building, and mock paper grouping.

---

## 2. Comprehensive Question Metadata Schema

The database relies on a relational cloud structure (e.g., PostgreSQL with Supabase) optimizing for complex joins, structured JSONB fields for dynamic options, and strict Row-Level Security (RLS).

### Core Tables

#### `taxonomy_nodes` (Chapters, Subjects, Topics)
A hierarchical configuration for mapping subjects to chapters and sub-topics.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary Key | Unique identifier |
| `type` | Enum | `EXAM`, `SUBJECT`, `CHAPTER`, `TOPIC` | Node level |
| `parent_id` | UUID | Foreign Key | Self-reference for hierarchy |
| `name` | String | Not Null | E.g., "Rotational Dynamics" |

#### `questions` (Primary Entity)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | Primary Key | Unique Question ID |
| `status` | Enum | Default: `DRAFT` | `DRAFT`, `REVIEW`, `APPROVED`, `ARCHIVED` |
| `difficulty` | Enum | Default: `NOT_SET` | `EASY`, `MEDIUM`, `HARD`, `NOT_SET` |
| `type` | Enum | Not Null | `MCQ`, `MSQ`, `NUMERICAL`, `TF`, `AR`, `MATRIX` |
| `taxonomy_ids` | Array[UUID] | Not Null | Array of mapped taxonomy nodes |
| `source_type` | Enum | Not Null | `PYQ`, `BOOK`, `CUSTOM` |
| `source_metadata`| JSONB | Nullable | e.g., `{"year": 2024, "shift": "Jan 27, Shift 1"}` |
| `content` | JSONB | Not Null | Holds the question text, options, matrices |
| `solution` | Text | Nullable | LaTeX compatible solution explanation |
| `marks_positive` | Numeric | Default: 4.0 | Positive marking scheme |
| `marks_negative` | Numeric | Default: -1.0 | Negative marking penalty |

---

## 3. Supported Question Types & Rich Content Specifications

### A. Formatting & Rich Text
*   **Mathematical Models:** Standardized on `KaTeX` for lightning-fast rendering. Uses strict delimiters: `$...$` for inline, `$$...$$` for block.
*   **Image Integration:** Images are uploaded to S3/Supabase Storage. The Markdown representation uses standard syntax: `![Alt Text](https://storage.../q_101_fig1.png)` which parses flawlessly during frontend rendering.

### B. Payload Structure (`content` JSONB Format)

#### Single/Multiple Choice (MCQ/MSQ)
```json
{
  "text": "Find the equivalent resistance between A and B.\n![Circuit](URL)",
  "options": [
    { "id": "A", "text": "$2 \\Omega$", "isCorrect": false },
    { "id": "B", "text": "$4 \\Omega$", "isCorrect": true }
  ]
}
```

#### Assertion & Reason (A-R)
```json
{
  "assertion": "A particle relies on... $v = u + at$",
  "reason": "Acceleration corresponds to...",
  "options": [
    { "id": "A", "text": "Both A and R are true, R is correct explanation", "isCorrect": true },
    { "id": "B", "text": "Both A and R are true, R is NOT correct", "isCorrect": false }
  ]
}
```

#### Numerical / Integer
```json
{
  "text": "Calculate the molarity of the solution...",
  "answer_range": {
    "exact": 2.54,
    "tolerance_min": 2.50,
    "tolerance_max": 2.60
  }
}
```

---

## 4. Bulk Import System & Documentation Formatting

The Bulk Import Pipeline is designed for data-entry operators handling thousands of records safely.

### Supported Formats
*   **CSV (.csv):** Used for large standard imports (MCQs, Numericals).
*   **JSON (.json):** Used for matrix match and complex AR transfers via API.
*   **ZIP (.zip):** Handles bundled `.csv` and an `/images` directory.

### Bulk Import Validation Pipeline
1.  **Schema Verification:** Validates headers (`Subject`, `Chapter`, `Type`, `Q_Text`, `Opt_A`, `Correct`). Drops the row immediately upon mandatory structural failure.
2.  **LaTeX Verification:** Regex checks for matching `$` terminators to ensure equations do not break the frontend React MathJax/KaTeX DOM tree.
3.  **Image Mapping:** When uploading a ZIP, the system reads the CSV image placeholder `[IMAGE:fig1.png]`, locates `fig1.png` in the ZIP, uploads it to cloud storage, and replaces the string with the generated persistent CDN URL.

### Example: Error Reporting Log (UI/CSV Export)
| Row | Column | Error Context | Action Required |
|---|---|---|---|
| 45 | `Correct_Opt` | Value "E" is invalid. Expected [A, B, C, D]. | Fix correct option mapping. |
| 112 | `Q_Text` | Unmatched `$` token detected at character 45. | Verify LaTeX formatting. |

---

## 5. Admin Panel & Management Workflows

### A. Dual-Pane Question Builder UI
Provides real-time WYSIWYG capabilities combined with raw LaTeX entry. 
*   **Left Pane:** Metadata configuration (Dropsdowns for Taxonomy, Source, Difficulty), Option inputs, and Markdown/LaTeX editor.
*   **Right Pane:** Live NTA-Simulated Rendering Engine showing the exact final product.

### B. Bulk Import Dashboard
*   Drag-and-drop zone with granular multi-threaded progress tracking.
*   Live parsing pipeline with immediate row-level error bubbling.

### C. Taxonomy & Paper Management
*   **Chapter Manager:** Tree-node based UI to add hierarchy branches (`Physics > Mechanics > Kinematics`) easily.
*   **Yearly Paper Manager:** A basket UI where admins can query (`PYQ = 2024`, `Shift = "Jan 27"`, `Subject = Physics`), select all results, and compile them into a locked `MockPaper` wrapper for students to consume.
