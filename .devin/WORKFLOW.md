# ZRC Stories Development Workflow

## Project Overview

**ZRC Stories** is a community content platform for PSHS-ZRC, featuring a React + Tailwind frontend and Python FastAPI backend for Facebook content extraction.

### Architecture
- **Frontend**: React 19 + Vite + Tailwind CSS 4 + Framer Motion (deployed on Vercel)
- **Backend**: FastAPI + SQLAlchemy + Apify integration (deployed on Render)
- **Data**: Multi-layer article storage (repo articles, custom articles, admin drafts)
- **Auth**: Frontend-only admin authentication with SHA256 hashing + PIN verification

### Core Features
- Public pages: Home, Gallery, Events, Article view, Search
- Admin system: Login, AdminHome, ArticleMaker with FB content import
- FB Content Extraction: Integration with `fb_downloader` service

---

## Agent-Based Development Workflow

This project uses a three-agent system for structured development:

### 1. Planner Agent (Architectural Specialist)
**Role**: Research, analyze, and create technical specifications

**Tools**: Read, Glob, Grep (read-only)

**Responsibilities**:
- Examine repository architecture and existing patterns
- Research dependencies across backend endpoints and frontend components
- Create detailed technical specifications with:
  - Expected API payloads
  - State shapes
  - File boundaries
  - Implementation steps
- Identify potential integration points and edge cases
- Present blueprints to coordinator for task assignment

**When to Use**:
- New feature development
- Complex refactoring
- Architecture changes
- Cross-component modifications

**Output**: Technical specification document with clear implementation steps

---

### 2. Implementer Agent (Full-Stack Developer)
**Role**: Execute code changes based on planner specifications

**Tools**: Read, Write, Edit, Bash (full access)
**Skills**: frontend-design (for UI work)

**Responsibilities**:
- Execute code changes incrementally
- Focus on assigned domain (Frontend layer or Backend layer)
- For UI components: Activate `frontend-design` skill for production-grade aesthetics
- Run local testing commands to ensure clean builds
- Follow existing code patterns and conventions
- Maintain consistency with Tailwind design system

**When to Use**:
- Implementing features from planner specifications
- Bug fixes
- Component development
- API endpoint creation

**Output**: Working code that builds and runs locally

---

### 3. Code-Reviewer Agent (Quality Control)
**Role**: Evaluate code changes for quality and security

**Tools**: Read, Glob, Grep (read-only)

**Responsibilities**:
- Scan for logical vulnerabilities and syntax errors
- Check for unhandled promise rejections in backend code
- Audit frontend implementation for:
  - Semantic HTML
  - Layout responsiveness
  - Accurate styling hooks
- Provide structured review checklist with PASS/REFACTORING status
- Suggest improvements without write permissions

**When to Use**:
- After implementer completes changes
- Before merging code
- For security audits
- Code quality checks

**Output**: Structured review report with recommendations

---

## Standard Development Process

### Phase 1: Planning (Planner Agent)
1. **Receive user request** for feature/fix/change
2. **Explore codebase** to understand:
   - Existing patterns and conventions
   - Integration points
   - Dependencies
3. **Create technical specification** including:
   - File changes needed
   - API contracts (if applicable)
   - State management approach
   - Component structure
   - Testing strategy
4. **Present specification** for approval

### Phase 2: Implementation (Implementer Agent)
1. **Review planner specification**
2. **Determine layer** (frontend vs backend)
3. **Activate frontend-design skill** if UI work
4. **Implement changes incrementally**:
   - Create/modify files
   - Follow existing patterns
   - Maintain code style consistency
5. **Test locally**:
   - Frontend: `npm run dev` + `npm run build`
   - Backend: `uvicorn main:app --reload`
6. **Verify** changes work as expected

### Phase 3: Review (Code-Reviewer Agent)
1. **Examine implemented changes**
2. **Check for**:
   - Security vulnerabilities
   - Logical errors
   - Edge cases
   - Code quality issues
   - Responsive design (if frontend)
3. **Provide structured review**:
   - PASS items
   - REFACTORING suggestions
   - Security concerns
4. **Return to implementer** if issues found

### Phase 4: Finalization
1. **Address review feedback** (implementer)
2. **Re-review if needed** (code-reviewer)
3. **Commit changes** with proper message
4. **Test deployment locally**

---

## Project-Specific Guidelines

### Frontend Development
- **Stack**: React 19, Vite, Tailwind CSS 4, Framer Motion, React Router 7
- **Styling**: Use existing Tailwind design system in `main/src`
- **Components**: Follow existing component structure in `src/components/`
- **State**: Use React hooks and context patterns
- **Routing**: React Router with lazy loading
- **Build**: `npm run build` must succeed
- **Lint**: `npm run lint` must pass

### Backend Development
- **Stack**: FastAPI, SQLAlchemy, httpx, yt-dlp
- **API**: RESTful endpoints with proper error handling
- **Database**: SQLite with ORM patterns
- **CORS**: Configure for frontend origins
- **Environment**: Use `.env.example` as template
- **Testing**: Start with `uvicorn main:app --reload`

### Article System Architecture
- **Repository Pattern**: `articleRepository.js` merges multiple storage layers
- **Storage Layers**:
  - `articles.generated.json` - Canonical repo articles
  - `customArticlesStorage.js` - Local custom articles
  - `adminDraftsStorage.js` - Admin draft articles
- **Categories**: Defined in `constants/categories.js`
- **Tags**: Special tags in `constants/specialTags.js`

### Admin Authentication
- **Location**: `src/features/admin/auth/`
- **Method**: SHA256 hashing + 4-digit PIN
- **Scope**: Frontend-only gate (not production security)
- **Components**: `AdminAuthProvider`, `RequireAdmin`

### Facebook Content Integration
- **Backend**: `fb_downloader/` FastAPI service
- **API**: `/import` endpoint with Apify integration
- **Frontend**: ArticleMaker component with import UI
- **Environment**: `VITE_FB_EXTRACTOR_API_URL` configuration
- **Fallback**: Content-aware strategy with multiple extraction methods

---

## Common Commands

### Frontend (main/)
```bash
cd main
npm install              # Install dependencies
npm run dev             # Start dev server (localhost:5173)
npm run build           # Build for production
npm run lint            # Run ESLint
npm run preview         # Preview production build
```

### Backend (fb_downloader/)
```bash
cd fb_downloader
pip install -r requirements.txt    # Install dependencies
playwright install chromium         # Install browser
uvicorn main:app --reload --host 0.0.0.0 --port 8000  # Start server
```

### Environment Setup
- Frontend: Copy `main/.env.example` to `main/.env` (if needed)
- Backend: Copy `fb_downloader/.env.example` to `fb_downloader/.env`
- Required: `APIFY_API_TOKEN` for FB extraction

---

## Decision Flow Chart

```
User Request
    ↓
Is it a new feature or complex change?
    ↓ Yes
[PLANNER] → Create specification → Approval?
                                    ↓ No
                              Refine spec
                                    ↓ Yes
    ↓ No (simple bug fix)
[IMPLEMENTER] → Direct implementation
    ↓
[CODE-REVIEWER] → Quality check → Issues found?
                                    ↓ Yes
                              [IMPLEMENTER] → Fix → Re-review
                                    ↓ No
                              Changes approved
    ↓
Test locally → Commit → Deploy
```

---

## File Structure Reference

### Frontend (main/)
```
src/
├── components/
│   ├── common/          # Shared UI components
│   ├── layout/          # Layout components
│   └── responsive/      # Responsive utilities
├── features/
│   ├── admin/           # Admin system
│   │   ├── auth/        # Authentication
│   │   └── components/  # Admin UI
│   └── articles/       # Article system
│       ├── constants/   # Categories, icons, tags
│       └── domain/      # Repository, storage, selectors
├── pages/               # Route pages
│   ├── admin/           # Admin pages
│   └── [public pages]   # Public pages
├── core/                # Core utilities
├── data/                # Static data
└── assets/              # Images, fonts, icons
```

### Backend (fb_downloader/)
```
main.py                  # FastAPI app & endpoints
scraper.py               # FB content extraction logic
database.py              # SQLAlchemy models & DB setup
requirements.txt         # Python dependencies
Dockerfile               # Container configuration
.env.example             # Environment template
```

---

## Quality Checklist

### Before Submitting Changes
- [ ] Code follows existing patterns
- [ ] Build commands succeed (npm run build / backend starts)
- [ ] No linting errors
- [ ] Responsive design tested (if frontend)
- [ ] Error handling implemented
- [ ] Environment variables documented
- [ ] Database migrations considered (if schema change)

### Security Considerations
- [ ] No hardcoded secrets
- [ ] Input validation on user data
- [ ] SQL injection prevention (use ORM)
- [ ] XSS prevention (React handles most)
- [ ] CORS properly configured
- [ ] Rate limiting considered (if applicable)

---

## Emergency Procedures

### Build Failures
1. Check dependency versions in package.json/requirements.txt
2. Clear node_modules/.venv and reinstall
3. Verify environment variables
4. Check for syntax errors

### API Integration Issues
1. Verify backend is running on correct port
2. Check CORS configuration
3. Validate API token/environment variables
4. Review error logs in backend console

### Authentication Problems
1. Verify admin credentials in storage
2. Check SHA256 hashing implementation
3. Clear browser localStorage if needed
4. Verify PIN generation logic

---

## Notes

- This is a school project with frontend-only authentication (not production security)
- FB extraction relies on third-party Apify API (may have rate limits)
- Article system uses local storage for persistence
- Design system uses CSS custom properties for category colors
- All admin routes require authentication via `RequireAdmin` component
