# Smart Water Distribution Management

A comprehensive Node.js backend server for managing smart water distribution systems, providing real-time hardware control, customer management, billing, and administrative APIs with IoT integration.

> **Note**: This is the software component of a Computer Engineering graduation project, designed to provide a complete digital solution for smart water distribution management.

## 🚀 Features

### 🏗️ Core System
- **RESTful API** for water distribution management
- **Real-time Socket.IO** communication for live updates
- **MongoDB** database with Mongoose ODM
- **JWT Authentication** and authorization
- **Hardware Integration** with Raspberry Pi GPIO control

### 💧 Water Management
- **Parallel Water Pumping** - Multiple tanks simultaneously
- **Flow Sensor Integration** - Real-time water flow measurement
- **Ultrasonic Level Monitoring** - Accurate tank level readings
- **Automated Pump Control** - Smart scheduling and control
- **Water Usage Tracking** - Daily/monthly consumption analytics

### 👥 Customer Management
- **Customer Registration** and profile management
- **Family Member Management** with age-based water allocation
- **Tank Assignment** and ownership tracking
- **Geographic Coordinates** for tank location mapping

### 💰 Billing System
- **Automated Bill Generation** based on water usage
- **Payment Status Tracking** (Paid/Unpaid)
- **Usage-based Pricing** with family size considerations
- **Monthly Billing Cycles** with detailed breakdowns

### 🔧 Hardware Control
- **GPIO Pin Management** for sensors and actuators
- **Water Pump Control** with duration settings
- **Solenoid Valve Control** for individual tank access
- **Sensor Calibration** and error handling
- **Thread-safe Operations** for concurrent hardware access

### 📊 Monitoring & Analytics
- **Real-time Tank Levels** via ultrasonic sensors
- **Water Flow Measurement** with pulse counting
- **Daily Usage Statistics** per tank and customer
- **System Health Monitoring** and error reporting

### 🔔 Notifications
- **Real-time Notifications** via Socket.IO
- **Pump Completion Alerts** with volume and level data
- **Bill Payment Reminders** and status updates
- **System Status Notifications** for maintenance

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Socket.IO** - Real-time communication
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

### Hardware Integration
- **Python Flask** - Hardware control server
- **RPi.GPIO** - Raspberry Pi GPIO control
- **Threading** - Concurrent sensor operations
- **Ultrasonic Sensors** - Water level measurement
- **Flow Sensors** - Water flow detection
- **Solenoid Valves** - Water flow control
- **Water Pumps** - Main distribution system

### IoT Components
- **YF-S201 Flow Sensors** - Water flow measurement
- **HC-SR04 Ultrasonic Sensors** - Distance/level measurement
- **Relay Modules** - Solenoid valve control
- **Water Pumps** - Main water distribution

## 📁 Project Structure

```
smart-water-distribution-system/
├── controllers/           # API route controllers
│   ├── admin.controller.js
│   ├── auth.controller.js
│   ├── customer.controller.js
│   ├── index.controller.js
│   └── tank.controller.js
├── models/               # Database models
│   ├── admin.model.js
│   ├── bill.model.js
│   ├── customer.model.js
│   ├── main_tank.model.js
│   └── tank.model.js
├── routes/               # API routes
├── middleware/           # Authentication & validation
├── utils/               # Helper functions
├── hardware.py          # Python hardware control server
├── Socket.js            # Socket.IO configuration
└── server.js           # Main application entry point
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Python 3.x (for hardware control)
- Raspberry Pi (for IoT integration)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd smart-water-distribution-system
```

2. **Install Node.js dependencies**
```bash
npm install
```

3. **Install Python dependencies**
```bash
pip install flask RPi.GPIO
```

4. **Environment Setup**
Create a `.env` file with:
```env
MONGODB_URI=mongodb://localhost:27017/water-distribution
JWT_SECRET=your-secret-key
PORT=3000
HARDWARE_SERVER_URL=http://localhost:5000
```

5. **Start the servers**

Backend Server:
```bash
npm start
```

Hardware Control Server:
```bash
python hardware.py
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Customer Management
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Tank Management
- `GET /api/tanks` - Get all tanks
- `POST /api/tanks` - Create new tank
- `PUT /api/tanks/:id` - Update tank
- `GET /api/tanks/:id/level` - Read tank level

### Water Control
- `POST /api/pump-water` - Start water pumping process
- `POST /api/calculate-capacity` - Calculate tank capacity

### Billing
- `GET /api/bills` - Get all bills
- `POST /api/bills` - Generate new bill
- `PUT /api/bills/:id` - Update bill status

## 🔧 Hardware Integration

### Flow Sensor Calibration
The system uses calibrated flow sensors with the following configuration:
```python
FLOW_PULSE_PER_LITER = 5.5  # Calibrated: 11 pulses = 2 liters
```

### Ultrasonic Sensor Setup
Tank level measurement using HC-SR04 sensors:
- 5 readings per measurement
- Average calculation for accuracy
- Distance to volume conversion

### Parallel Processing
Multiple tanks can be processed simultaneously using Python threading:
```python
with ThreadPoolExecutor(max_workers=len(tanks)) as executor:
    futures = [executor.submit(measure_water_flow_for_tank, tank, duration) for tank in tanks]
```

## 📡 Socket.IO Events

### Client → Server
- `connection` - Client connection
- `disconnect` - Client disconnection

### Server → Client
- `new_notification` - New notification for user
- `tank_level_update` - Real-time tank level updates

## 🎯 Key Features Implementation

### Parallel Water Pumping
- Multiple tanks receive water simultaneously
- Thread-safe pulse counting for each tank
- Individual valve control per tank
- Concurrent ultrasonic readings

### Smart Billing
- Family size-based water allocation
- Age-specific consumption calculations
- Automated monthly bill generation
- Payment status tracking

### Real-time Monitoring
- Live tank level updates
- Water flow measurement
- System status notifications
- Hardware error reporting

## 🔒 Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Error handling and logging

## 📈 Monitoring & Logging
- Comprehensive error logging
- Hardware operation tracking
- Water usage analytics
- System performance monitoring

## 🤝 Contributing
This is a graduation project. For questions or collaboration, please contact the development team.

## 📄 License
This project is part of a Computer Engineering graduation project.

---

**Developed as part of Computer Engineering Graduation Project**  
*Smart Water Distribution Management System*
