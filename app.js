const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI =
	'mongodb+srv://geoge:natours@cluster0.yzrsn.mongodb.net/testTemplate';

const app = express();
const store = new MongoDBStore({
	uri: MONGODB_URI,
	collection: 'sessions',
});
// protects from cloning the fontend. it creates an csrf token to be sure that the user is working with your frontend
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'images');
	},
	filename: (req, file, cb) => {
		cb(
			null,
			new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname
		);
	},
});

const fileFilter = (req, file, cb) => {
	if (
		file.mimetype === 'image/png' ||
		file.mimetype === 'image/jpg' ||
		file.mimetype === 'image/jpeg'
	) {
		cb(null, true);
	} else {
		cb(null, false);
	}
};

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
	multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// init session
app.use(
	session({
		secret: 'my secret',
		resave: false,
		saveUninitialized: false,
		store: store,
	})
);

// with post req it checks for token
// these two middleware must initialize after the session
app.use(csrfProtection);
app.use(flash());

// middleware to store user in the request. It is used in getCart,postCart, postCartDeleteProduct, postOrder, getOrders
app.use((req, res, next) => {
	if (!req.session.user) {
		return next();
	}
	// use session data to load user from collection.
	User.findById(req.session.user._id)
		.then((user) => {
			// store the current logged in user in req.user
			req.user = user;
			next();
		})
		.catch((err) => console.log(err));
});

// middleware that sets the csrf token on every req. On every form in view we must add: <input type="hidden" name="_csrf" value="<%= csrfToken %>">
app.use((req, res, next) => {
	// set for the views that are rendered
	res.locals.isAuthenticated = req.session.isLoggedIn;
	res.locals.csrfToken = req.csrfToken();
	next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);
app.use(errorController.get404);
// error handler middleware
app.use((error, req, res, next) => {
	// res.status(error.httpStatusCode).render(...);
	// res.redirect('/500');
	res.status(500).render('500', {
		pageTitle: 'Error!',
		path: '/500',
		isAuthenticated: req.session.isLoggedIn,
	});
});

mongoose
	.connect(MONGODB_URI)
	.then((result) => {
		app.listen(3001);
		console.log('beep, bloop, blop, connected to mongodb!');
	})
	.catch((err) => {
		console.log(err);
	});
