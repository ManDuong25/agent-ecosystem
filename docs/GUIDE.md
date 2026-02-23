# Agent-Ecosystem: Hướng Dẫn Sử Dụng & Ứng Dụng Thực Tế

> 📅 Tài liệu: 2026-02-23  
> 📦 Phiên bản: agent-ecosystem v0.2.0  
> 🏗️ Demo App: Smart Expense Tracker v1.0.0

---

# PHẦN 1: CÁCH SỬ DỤNG AGENT-ECOSYSTEM

## 1.1 Tổng Quan

**Agent-Ecosystem** là một nền tảng web hỗ trợ phát triển phần mềm theo phương pháp **Spec-Driven Development (SDD)** — kết hợp AI, tự động hoá, và quản lý kỹ năng (skills) để đẩy nhanh quy trình từ ý tưởng → đặc tả → thiết kế → triển khai.

### Kiến trúc:
```
┌─────────────────────────────────────────────────┐
│  React 19 + Vite Frontend (port 5173)           │
│  ┌───────┐ ┌────────┐ ┌──────┐ ┌────────────┐  │
│  │Dashboard│ │Skills  │ │Specs │ │AI Engineer │  │
│  └───────┘ └────────┘ └──────┘ └────────────┘  │
├─────────────────────────────────────────────────┤
│  Express.js + Socket.io Backend (port 4927)     │
│  ┌──────┐ ┌─────────┐ ┌────┐ ┌─────────────┐  │
│  │Repo  │ │Skill Mgr│ │Spec│ │Chrome Bridge│  │
│  │Scanner│ │         │ │Eng.│ │(Puppeteer)  │  │
│  └──────┘ └─────────┘ └────┘ └─────────────┘  │
├─────────────────────────────────────────────────┤
│  ProxyPal / Gemini API (AI Generation)          │
└─────────────────────────────────────────────────┘
```

## 1.2 Cài Đặt & Khởi Chạy

### Yêu cầu:
- Node.js >= 18
- Git
- Chrome/Chromium (cho AI Engineer Loop)

### Cài đặt:
```bash
cd D:\agent-ecosystem
npm install
```

### Chạy development:
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:4927

### Chạy production:
```bash
npm run build
npm start
```

### Chạy tests:
```bash
npm test              # 39 Playwright E2E tests
npm run test:ui       # Playwright UI mode
```

## 1.3 Các Tính Năng Chính

### 🏠 Dashboard
- Tổng quan trạng thái repository
- Quick stats: Repo status, Skills count, Specs count, AI proxy status
- WebSocket real-time connection status
- Get Started guide khi chưa setup repo

### 📂 Repository Setup
1. Paste đường dẫn dự án vào input (VD: `D:\my-project`)
2. Click **Scan & Setup** — hệ thống sẽ:
   - Quét cấu trúc thư mục
   - Phát hiện ngôn ngữ, framework
   - Tạo `repo-profile.json` (thông tin dự án)
   - Tạo agent bridge files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, v.v.)
   - Auto-generate copilot instructions
3. Bật **Watch Mode** để tự động phát hiện thay đổi

### 🧩 Skill Management  
Skills = các kho kiến thức/prompt có namespace, quản lý qua GitHub repos.

1. **Thêm skill source**: Paste URL GitHub repo → Click **Add**
2. Hệ thống clone/pull repo vào `~/.agent-ecosystem/hub/`
3. **Skills Index**: Xem tất cả skills đã index, phân theo namespace
4. **Update All**: Pull tất cả skill sources mới nhất
5. Skills sử dụng format `SKILL.md` và được nhóm theo `oa-*` (OpenAI official) hoặc `ag-*` (community)

### 📋 Specifications (SDD Workflow)
Quy trình chính — **4 giai đoạn**:

#### Giai đoạn 1: Specify (Đặc tả)
```
Tạo spec mới → Nhập tên + mô tả feature → Click "Create Spec"
```
Hệ thống tạo:
- **spec.json**: JSON cấu trúc lưu toàn bộ spec

#### Giai đoạn 2: Generate Requirements (Yêu cầu)
```
Click "Generate Requirements" → AI tạo yêu cầu theo EARS format
```
- EARS = Easy Approach to Requirements Syntax
- Format: "When [trigger], the system SHALL [behavior]"
- Stream real-time qua SSE (Server-Sent Events)

#### Giai đoạn 3: Generate Design (Thiết kế)
```
Click "Generate Design" → AI tạo thiết kế hệ thống
```
- API endpoints
- Data model (Mermaid ER diagram)
- Architecture diagram
- Component breakdown

#### Giai đoạn 4: Generate Tasks (Công việc)
```
Click "Generate Tasks" → AI tạo danh sách tasks chi tiết  
```
- Tasks theo TDD approach
- Mỗi task có: title, description, status (todo/in-progress/done)
- Tracks traceably back to requirements

### 🤖 AI Engineer Loop
Tính năng mạnh nhất — kết nối trực tiếp với Gemini/ChatGPT qua Chrome:

1. **Launch Chrome**: Mở Chrome với custom profile (giữ login)
2. **Configure**:
   - Chrome Profile Path: đường dẫn Chrome profile (giữ đăng nhập Google/OpenAI)
   - Target: Gemini hoặc ChatGPT
3. **Send Code**: Gửi file/code để AI review
4. **File Watching**: Auto-detect thay đổi, gửi diff cho AI review
5. **Real-time streaming**: Nhận phản hồi AI qua WebSocket

#### Chrome Profile:
```
# Windows default:
C:\Users\<user>\AppData\Local\Google\Chrome\User Data\Profile 1

# Hoặc tạo profile riêng:
~/.agent-ecosystem/chrome-profile
```

### 🐛 Bug Tracker
- Report bugs với severity (Low/Medium/High/Critical)
- AI analysis cho từng bug
- Track status: Open → In Progress → Resolved → Closed
- Tích hợp vào spec workflow

## 1.4 API Endpoints

### Repository
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/repo/setup` | Setup repository |
| GET | `/api/repo/profile` | Lấy repo profile |
| POST | `/api/repo/scan` | Quét cấu trúc |
| GET | `/api/repo/context` | Context cho AI |
| POST | `/api/repo/watch` | Bật file watcher |

### Skills
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/skills` | Danh sách skill sources |
| POST | `/api/skills` | Thêm skill source |
| PUT | `/api/skills/:id` | Update skill |
| PUT | `/api/skills` | Update tất cả |
| GET | `/api/skills/index` | Skills index |
| DELETE | `/api/skills/:id` | Xoá skill |

### Specifications
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/specs?repoPath=` | Liệt kê specs |
| POST | `/api/specs` | Tạo spec mới |
| DELETE | `/api/specs/:id` | Xoá spec |
| GET | `/api/specs/:id/requirements` | Generate requirements (SSE) |
| GET | `/api/specs/:id/design` | Generate design (SSE) |
| GET | `/api/specs/:id/tasks` | Generate tasks (SSE) |
| PUT | `/api/specs/:id/tasks/:taskId` | Update task status |

### AI
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/ai/config` | AI configuration |
| POST | `/api/ai/chat` | Chat with AI |
| POST | `/api/ai/chat/stream` | Chat streaming (SSE) |
| POST | `/api/ai/analyze-repo` | Analyze repo (SSE) |

### Engineer (Chrome Bridge)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/engineer/chrome/status` | Chrome session status |
| POST | `/api/engineer/chrome/launch` | Launch Chrome |
| POST | `/api/engineer/chrome/close` | Close Chrome |
| PUT | `/api/engineer/chrome/config` | Update Chrome config |
| POST | `/api/engineer/review` | Send code for review |
| POST | `/api/engineer/send` | Send message to AI |

## 1.5 WebSocket Events

| Event | Direction | Data |
|-------|-----------|------|
| `file-change` | Server → Client | `{ path, type: 'added'|'modified'|'deleted' }` |
| `scan-progress` | Server → Client | `{ step, total, message }` |
| `ai-stream` | Server → Client | `{ chunk, done }` |
| `chrome-status` | Server → Client | `{ connected, page }` |

## 1.6 Playwright E2E Tests

39 tests covering:
- **Dashboard**: Heading, stats cards, get-started banner, navigation
- **Skills**: Heading, empty state, index cards, add input, validation, update all
- **Repo Setup**: Heading, path input, scan button
- **Specs**: Heading, empty state, create form, validation
- **AI Engineer**: Heading, status, target selector, launch button, config toggle, textarea
- **Bugs**: Heading, repo-needed, stats cards, report button, form, severity
- **API**: Health, skills CRUD, specs CRUD, bugs, chrome status/config, AI config

---

# PHẦN 2: ỨNG DỤNG THỰC TẾ VỚI DỰ ÁN QUAN4

## 2.1 Bối Cảnh: Dự Án Quan4-Culinary-Tourism-System-From-Scratch

Dự án du lịch ẩm thực sử dụng:
- **Backend**: FastAPI (Python)
- **Frontend**: React + Vite
- **Features**: Geofencing, đa ngôn ngữ, audio narration, offline-first, PWA, admin dashboard

## 2.2 Bước 1: Setup Agent-Ecosystem cho Quan4

### 1. Khởi động agent-ecosystem:
```bash
cd D:\agent-ecosystem
npm run dev
```

### 2. Mở browser → http://localhost:5173

### 3. Vào **Repo Setup** → paste:
```
D:\Quan4-Culinary-Tourism-System-From-Scratch
```

### 4. Click **Scan & Setup**
Hệ thống sẽ tự động:
- Quét cấu trúc `frontend/`, `backend/`, `docs/`, `tests/`, v.v.
- Phát hiện: FastAPI + React/Vite stack
- Đọc các docs có sẵn: `AGENTS.md`, `CONVENTIONS.md`, `BUSINESS_LOGIC.md`
- Tạo/cập nhật `repo-profile.json`
- Generate agent bridge files (nếu chưa có)

## 2.3 Bước 2: Thêm Skills

### Mở tab **Skills** → thêm skill sources:
```
# Thêm community skills (nếu có repo):
https://github.com/your-org/fastapi-skills
https://github.com/your-org/react-vite-skills
```

Skills được tự động index và sẵn sàng cho AI sử dụng khi generate specs.

## 2.4 Bước 3: Tạo Feature Mới (SDD Workflow)

### Ví dụ: Thêm tính năng "Đánh giá nhà hàng" (Restaurant Reviews)

#### Giai đoạn 1 — Specify:
1. Mở tab **Specifications**
2. Nhập: `restaurant-reviews`
3. Mô tả: `Users can write, read, and rate restaurant reviews with photos, integrated with existing POI system`
4. Click **Create Spec**

#### Giai đoạn 2 — Generate Requirements:
1. Click **Generate Requirements**
2. AI sẽ tạo requirements dạng EARS:
```
R1: When the user views a POI detail page, the system SHALL display existing reviews.
R2: When the user submits a review, the system SHALL validate rating (1-5), text content, and optional photos.
R3: When the user is within the geofenced area, the system SHALL allow "Verified Visit" badge.
...
```

#### Giai đoạn 3 — Generate Design:
1. Click **Generate Design**
2. AI tạo:
   - API endpoints: `POST /api/reviews`, `GET /api/reviews/:poiId`, v.v.
   - Data model: Review table, rating fields, photo storage
   - Frontend components: ReviewCard, ReviewForm, StarRating
   - Integration points: POI system, Geofencing, Language service

#### Giai đoạn 4 — Generate Tasks:
1. Click **Generate Tasks**
2. AI tạo danh sách tasks:
```
T1: Create Review SQLAlchemy model ✅
T2: Implement review CRUD API endpoints ✅  
T3: Add review validation middleware
T4: Create ReviewCard component
T5: Create ReviewForm component
T6: Integrate with POI detail page
T7: Add photo upload support
T8: Add "Verified Visit" geofence check
T9: Write pytest backend tests
T10: Write Playwright frontend tests
```

## 2.5 Bước 4: AI Engineer Loop

### Sử dụng AI Engineer để review code tự động:

#### Setup Chrome Profile:
1. Mở tab **AI Engineer**
2. Click ⚙️ (Settings gear)
3. Nhập Chrome Profile Path:
```
C:\Users\mansh\AppData\Local\Google\Chrome\User Data\Default
```
4. Chọn target: **Gemini** (khuyến nghị vì Gemini 3.1 Pro mạnh)

#### Launch & Review:
1. Click **Launch Chrome** → Chrome mở với profile (đã đăng nhập Google)
2. Sau khi code, hệ thống tự detect file changes
3. Gửi code diff → Gemini review
4. Nhận feedback real-time qua WebSocket

#### Workflow thực tế:
```
1. Agent-Ecosystem detect: backend/app/models/review.py changed
2. Auto-send diff to Gemini
3. Gemini reviews: "Missing index on poi_id column for query performance"
4. Fix → commit → next task
```

## 2.6 Bước 5: Kết Hợp với GitHub Copilot & Codex

Agent-Ecosystem **bổ sung** cho Copilot, không thay thế:

| Tool | Vai trò |
|------|---------|
| **Agent-Ecosystem** | Spec-driven planning, skill routing, Chrome AI bridge |
| **GitHub Copilot** | Inline code completion, chat, đề xuất code |
| **Codex** | Long-running tasks, multi-file changes, autonomous coding |

### Quy trình kết hợp:
1. Agent-Ecosystem tạo spec + tasks
2. Copilot hỗ trợ viết code từng task
3. Agent-Ecosystem review qua AI Engineer Loop
4. Codex xử lý các task phức tạp (refactor, migration)
5. Agent-Ecosystem track progress qua Spec status

### Copilot Instructions đã được generate:
File `.github/copilot-instructions.md` chứa:
- Repository profile, architecture
- Skill routing rules
- Validation gates (pytest, lint, build)
- Safety rules

## 2.7 Bước 6: Mô Phỏng Chèn Feature Giữa Chừng

### Tình huống:
> Đang phát triển "Restaurant Reviews" (task T5/T10), PM yêu cầu gấp: "Thêm tính năng Chia sẻ chi phí nhóm cho tour"

### Xử lý:
1. **Tạo spec mới**: `group-expense-sharing`
2. **Generate requirements** → AI nhận context dự án hiện tại
3. **Generate tasks** → AI tạo tasks mới, tránh conflict với reviews spec
4. **Interleave tasks**: Làm xen kẽ giữa 2 specs
5. **Track progress**: Mỗi spec có status riêng

### Trong expense-tracker demo:
- Tính năng `Shared Expenses` chính là ví dụ **mid-dev feature insertion**
- Đang build transactions/analytics → chèn shared expense tracking
- Thêm fields `splitWith`, `paidBy` vào Transaction model
- Thêm trang `/shared` và endpoint `/api/analytics/shared-expenses`
- Không break existing functionality

## 2.8 Validation Quan4

Sau khi implement feature:

```bash
# Backend validation
cd D:\Quan4-Culinary-Tourism-System-From-Scratch\backend
python -m pytest -q

# Frontend validation  
cd D:\Quan4-Culinary-Tourism-System-From-Scratch\frontend
npm run lint && npm run build

# E2E tests
npx playwright test
```

## 2.9 Workflow Summary

```
┌──────────────────────────────────────────────────┐
│  1. SETUP: Scan repo → Generate profile & bridges│
├──────────────────────────────────────────────────┤
│  2. SKILLS: Add skill sources → Index → Route    │
├──────────────────────────────────────────────────┤
│  3. SPECIFY: Create spec → Name + Description    │
├──────────────────────────────────────────────────┤
│  4. REQUIREMENTS: AI generates EARS requirements │
├──────────────────────────────────────────────────┤
│  5. DESIGN: AI generates architecture + diagrams │
├──────────────────────────────────────────────────┤
│  6. TASKS: AI generates TDD task list            │
├──────────────────────────────────────────────────┤
│  7. IMPLEMENT: Code with Copilot + AI review     │
├──────────────────────────────────────────────────┤
│  8. VALIDATE: Run tests, lint, build             │
├──────────────────────────────────────────────────┤
│  9. ITERATE: Track bugs, insert features         │
└──────────────────────────────────────────────────┘
```

---

# PHỤ LỤC

## A. Cấu Trúc Thư Mục Agent-Ecosystem

```
D:\agent-ecosystem/
├── src/
│   ├── client/          # React 19 frontend
│   │   ├── pages/       # Dashboard, Skills, Specs, AIEngineer, Bugs, RepoSetup
│   │   ├── components/  # Layout, MarkdownView, StatusBadge
│   │   └── lib/         # api.ts, socket.ts, store.tsx
│   ├── server/          # Express.js backend
│   │   ├── routes/      # repo, skills, specs, ai, engineer
│   │   └── services/    # repo-scanner, skill-manager, spec-engine, chrome-bridge, ai-client
│   └── shared/          # types.ts
├── tests/               # 7 Playwright test files, 39 test cases
├── templates/           # 11 Handlebars templates for agent bridges
├── demo-apps/
│   └── expense-tracker/ # Demo app built via SDD workflow
└── package.json
```

## B. Demo App: Smart Expense Tracker

Ứng dụng quản lý chi tiêu hoàn chỉnh, được xây dựng theo SDD:

### Features:
- ✅ CRUD transactions (thêm/sửa/xoá giao dịch)
- ✅ 8 categories mặc định + custom categories
- ✅ Multi-currency (USD, EUR, VND, JPY, GBP)
- ✅ Recurring expenses (daily/weekly/monthly/yearly)
- ✅ Budget management with warnings/alerts
- ✅ Analytics: Pie chart by category, Bar chart trends
- ✅ CSV/JSON export
- ✅ Search & filter transactions
- ✅ Shared expenses (mid-dev feature insertion demo)

### Chạy:
```bash
cd D:\agent-ecosystem\demo-apps\expense-tracker
npm install
npm run dev    # Server: 5201, Client: 5200
```

### Tech Stack:
- Frontend: React 19 + Vite + TailwindCSS + Recharts
- Backend: Express.js + SQLite (better-sqlite3)
- 6 API route groups, 15+ endpoints
- Full spec document in `specs/smart-expense-tracker/spec.json`

## C. Lỗi Đã Fix Trong Phiên Này

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| 500 on `/skills/index` | `buildSkillIndex()` missing `ensureHub()` call | Added `ensureHub()` at function start |
| Wrong start script | tsconfig rootDir changed, output path shifted | Fixed to `dist/server/server/index.js` |
| tsx not installed | Missing devDependency | Added `tsx` to devDependencies |
| 12 Playwright failures | Multiple h1 elements, strict mode violations | Fixed selectors to use `getByRole('heading')`, `{ exact: true }` |

## D. Tiếp Theo

- [ ] Kết nối ProxyPal/Gemini API để AI generate requirements/design/tasks thực tế
- [ ] Template customization cho Quan4 (FastAPI + React specifics)
- [ ] CI/CD integration: auto-run specs on PR
- [ ] Skill authoring guide: tạo custom skills cho team

---

*Tài liệu này được tạo bởi GitHub Copilot (Claude Opus 4.6) sử dụng agent-ecosystem v0.2.0*
