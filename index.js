const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");

const app = express();

// ⚠️ Replace with your actual values
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const SHOPIFY_STORE = process.env.SHOPIFY_STORE; // your-store.myshopify.com
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;

// Middleware
app.use(cors({
  origin: [
    'https://your-store.myshopify.com',  // ⚠️ Replace with your store URL
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());

// File upload setup
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// In-memory storage (replace with database in production)
const users = [];
const products = [];

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Routes
app.get("/", (req, res) => {
  res.send("Seller Program API is running 🚀");
});

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: Date.now().toString(),
      name,
      email,
      password: hashedPassword,
      createdAt: new Date()
    };

    users.push(user);

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// Product Routes
app.get("/api/products", authMiddleware, (req, res) => {
  const userProducts = products.filter(p => p.userId === req.user.id);
  res.json({ success: true, products: userProducts });
});

app.post("/api/products", authMiddleware, upload.single('design'), async (req, res) => {
  try {
    const { title, description, product_type, price } = req.body;
    const designFile = req.file;

    // Create product record
    const product = {
      id: Date.now().toString(),
      userId: req.user.id,
      title,
      description,
      productType: product_type,
      price: parseFloat(price),
      status: 'pending',
      createdAt: new Date()
    };

    // TODO: Upload design to cloud storage (S3, Cloudinary, etc.)
    // TODO: Create product in Printify
    // TODO: Create product in Shopify

    // For now, just save locally
    products.push(product);

    res.json({ success: true, product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// Shopify callback (for future OAuth)
app.get("/auth/callback", (req, res) => {
  res.send("Callback works ✔");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Seller Program API running on port " + PORT);
});
