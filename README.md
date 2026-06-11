# Home School Platform

A full-stack home education platform for parents and children. Parents create schedules, lessons, worksheets, and quizzes. Children learn, complete work, take quizzes, and earn rewards.

## Features

- **Parent Dashboard**: Manage children, lessons, worksheets, quizzes, schedules, and rewards
- **Child Dashboard**: View daily planner, complete lessons, take quizzes, redeem rewards
- **Weekly Planner**: 5 lessons per day (Mon-Thu), 3 lessons (Fri)
- **Gamification**: Points, badges, streaks, and a rewards shop
- **Password Reset**: Secure token-based recovery flow
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Backend**: Python FastAPI, SQLAlchemy, SQLite
- **Frontend**: Vanilla HTML, CSS, JavaScript (ES modules)
- **Server**: Nginx (reverse proxy), systemd (process management)
- **Auth**: JWT tokens, bcrypt password hashing

## Quick Start (Development)

### Prerequisites

- Python 3.10+
- Nginx
- SQLite (bundled with Python)

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the API server (default: port 8001)
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

The API will be available at `http://127.0.0.1:8001`.
Swagger docs: `http://127.0.0.1:8001/docs`

### Frontend Setup

Serve the `frontend/` directory with any static file server. For development:

```bash
cd frontend
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Production Deployment

### 1. Configure Environment

Copy and edit the environment file:

```bash
cp .env.example .env
# Edit .env with your settings
```

### 2. Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve frontend
    location / {
        root /home/max/homeschool-platform/frontend;
        try_files $uri $uri/ =404;
    }

    # Proxy API calls to FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Systemd Service

Create `/etc/systemd/system/homeschool-api.service`:

```ini
[Unit]
Description=Home School Platform API
After=network.target

[Service]
Type=notify
User=max
Group=max
WorkingDirectory=/home/max/homeschool-platform/backend
ExecStart=/home/max/homeschool-platform/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable homeschool-api
sudo systemctl start homeschool-api
```

### 4. Verify

```bash
# Check API health
curl http://127.0.0.1:8001/api/v1/health

# Check frontend
curl http://localhost
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register-parent` | Register parent account |
| POST | `/api/v1/auth/register-child` | Register child account |
| POST | `/api/v1/auth/login` | Login and get JWT token |
| GET | `/api/v1/auth/me` | Get current user profile |
| POST | `/api/v1/auth/forgot-username` | Request username reminder |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password with token |

### Lessons
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/lessons` | List all lessons |
| POST | `/api/v1/lessons` | Create a new lesson |
| DELETE | `/api/v1/lessons/{id}` | Delete a lesson |

### Worksheets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/worksheets` | List all worksheets |
| POST | `/api/v1/worksheets` | Create a worksheet |
| DELETE | `/api/v1/worksheets/{id}` | Delete a worksheet |

### Quizzes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/quizzes` | List all quizzes |
| POST | `/api/v1/quizzes` | Create a quiz |
| DELETE | `/api/v1/quizzes/{id}` | Delete a quiz |

### Schedules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/schedules` | List schedules |
| POST | `/api/v1/schedules` | Create a schedule |
| DELETE | `/api/v1/schedules/{id}` | Delete a schedule |

### Rewards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/rewards` | List rewards |
| POST | `/api/v1/rewards` | Create a reward |
| POST | `/api/v1/rewards/{id}/redeem` | Redeem a reward |

### Progress
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/progress` | Get progress summary |
| POST | `/api/v1/progress/complete-lesson` | Mark lesson as complete |

## Database

SQLite database is created automatically at `backend/homeschool.db` on first run.

## Security Notes

- Passwords are hashed with bcrypt
- JWT tokens expire after 24 hours
- Reset tokens expire after 15 minutes and are single-use
- All API endpoints require authentication except `/health`, `/login`, `/register-*`, and recovery endpoints

## File Structure

```
homeschool-platform/
├── backend/
│   ├── app/
│   │   ├── api/          # API route handlers
│   │   ├── services/     # Business logic (email, gamification)
│   │   ├── models.py     # SQLAlchemy ORM models
│   │   ├── schemas.py    # Pydantic request/response models
│   │   ├── auth.py       # JWT auth & password hashing
│   │   ├── database.py   # DB engine & session
│   │   └── config.py     # Environment settings
│   ├── main.py           # FastAPI app entry point
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── css/
│   │   └── style.css     # Global styles
│   ├── js/
│   │   ├── api.js        # API client
│   │   ├── main.js       # Shared utilities
│   │   ├── parent-dashboard.js
│   │   └── child-dashboard.js
│   ├── parent-dashboard.html
│   ├── child-dashboard.html
│   ├── login.html
│   ├── register.html
│   ├── forgot-username.html
│   ├── forgot-password.html
│   └── reset-password.html
├── uploads/              # Uploaded files (PDFs, images)
├── .gitignore
└── README.md
```

## License

Private project. All rights reserved.
