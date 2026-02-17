# SecureBank - Online Banking System

A full-featured online banking web application with user authentication, multiple accounts, transfers, and an admin panel.

## Features

### User Features
- User registration and login
- Multiple account types (Checking & Savings)
- Deposit funds
- Withdraw funds
- Transfer between accounts
- Transaction history with filters
- Real-time balance updates

### Admin Features
- View all registered users
- View all transactions across the platform
- System statistics (total users, deposits, withdrawals)
- Export transactions to CSV
- Delete users and data

## Getting Started

1. Open `index.html` in a web browser
2. Register a new account or login
3. For admin access, click "Admin Login" and use password: `123456`

## Tech Stack
- HTML5
- CSS3 (modern responsive design)
- JavaScript (Vanilla)
- LocalStorage (data persistence)

## File Structure
```
├── index.html          # Login/Register page
├── dashboard.html      # User banking dashboard
├── admin.html          # Admin login
├── admin-dashboard.html # Admin panel
└── styles.css         # Global styles
```

## Data Storage
All data is stored in browser's LocalStorage:
- `banking_users` - User accounts
- `banking_transactions` - Transaction records
- `current_user` - Logged in user session
- `adminLoggedIn` - Admin session (sessionStorage)

## Security Note
This is a demonstration application. In production, use:
- Server-side validation
- Encrypted passwords (hashing)
- Secure database
- HTTPS encryption
- Session management
