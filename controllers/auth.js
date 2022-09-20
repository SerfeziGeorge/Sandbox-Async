// build in crypto library
const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
//const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator/check');

const User = require('../models/user');

const transporter = nodemailer.createTransport({
	host: 'smtp.mailtrap.io',
	port: 2525,
	auth: {
		user: 'cf7344559ec947',
		pass: '91202106aeef3e',
	},
});

// render login page

exports.getLogin = (req, res, next) => {
	// set errorMessage to null, fixes an error where the alert box always appears on screen
	let message = req.flash('error');
	if (message.length > 0) {
		message = message[0];
	} else {
		message = null;
	}
	res.render('auth/login', {
		path: '/login',
		pageTitle: 'Login',
		errorMessage: message,
		oldInput: {
			email: '',
			password: '',
		},
		validationErrors: [],
	});
};

// render singup page

exports.getSignup = (req, res, next) => {
	let message = req.flash('error');
	if (message.length > 0) {
		message = message[0];
	} else {
		message = null;
	}
	res.render('auth/signup', {
		path: '/signup',
		pageTitle: 'Signup',
		errorMessage: message,
		oldInput: {
			email: '',
			password: '',
			confirmPassword: '',
		},
		validationErrors: [],
	});
};

exports.postLogin = async (req, res, next) => {
	try {
		const email = req.body.email;
		const password = req.body.password;
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			console.log(errors.array());
			return res.status(422).render('auth/login', {
				path: '/login',
				pageTitle: 'Login',
				errorMessage: errors.array()[0].msg,
				oldInput: {
					email: email,
					password: password,
				},
				validationErrors: errors.array(),
			});
		}

		const user = await User.findOne({ email: email });
		if (!user) {
			//req.flash([key: string]: string[])
			//req.flash('error', 'Invalid email or password.');
			//return res.redirect('/login');
			return res.status(422).render('auth/login', {
				path: '/login',
				pageTitle: 'Login',
				errorMessage: 'Invalid email or password.',
				oldInput: {
					email: email,
					password: password,
				},
				validationErrors: [],
			});
		}

		const doMatch = await bcrypt.compare(password, user.password);

		if (doMatch) {
			// the session object comes from express-session
			req.session.isLoggedIn = true;
			req.session.user = user;
			return req.session.save((err) => {
				console.log(err);
				res.redirect('/');
			});
		}
		// req.flash('error', 'Invalid email or password.');
		// res.redirect('/login');
		return res.status(422).render('auth/login', {
			path: '/login',
			pageTitle: 'Login',
			errorMessage: 'Invalid email or password.',
			oldInput: {
				email: email,
				password: password,
			},
			validationErrors: [],
		});
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

exports.postSignup = async (req, res, next) => {
	try {
		const email = req.body.email;
		const password = req.body.password;

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			console.log(errors.array());
			return res.status(422).render('auth/signup', {
				path: '/signup',
				pageTitle: 'Signup',
				errorMessage: errors.array()[0].msg,
				oldInput: {
					email: email,
					password: password,
					confirmPassword: req.body.confirmPassword,
				},
				validationErrors: errors.array(),
			});
		}

		// check if the email address is already in use. We can also check this from the model
		// const userDoc = await User.findOne({ email: email });
		// if (userDoc) {
		// 	req.flash('error', 'E-Mail exists already, please pick a different one.');
		// 	return res.redirect('/signup');
		// }

		// the email is not in use, we auto-gen a salt and hash using bcrypt
		const hashpassword = await bcrypt.hash(password, 12);

		const user = new User({
			email: email,
			password: hashpassword,
			cart: { items: [] },
		});
		const userSaved = await user.save();
		const result = await userSaved;

		if (result) {
			res.redirect('/login');
			return transporter.sendMail({
				to: email,
				from: 'shop@node-complete.com',
				subject: 'Signup succeeded!',
				html: '<h1>You successfully signed up!</h1>',
			});
		}
	} catch {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

exports.postLogout = (req, res, next) => {
	// clear session
	req.session.destroy((err) => {
		console.log(err);
		res.redirect('/');
	});
};

// render reset page
exports.getReset = (req, res, next) => {
	let message = req.flash('error');
	if (message.length > 0) {
		message = message[0];
	} else {
		message = null;
	}
	res.render('auth/reset', {
		path: '/reset',
		pageTitle: 'Reset Password',
		errorMessage: message,
	});
};

exports.postReset = (req, res, next) => {
	// create token that has expiring date, store in db
	// crypto = create sigure random values
	// randomBytes(size: number, callback: (err: Error, buf: Buffer)
	crypto.randomBytes(32, (err, buffer) => {
		if (err) {
			console.log(err);
			return res.redirect('/reset');
		}
		// buffer will store hexidecimal values
		const token = buffer.toString('hex');
		// the token will stored on the user object
		User.findOne({ email: req.body.email })
			.then((user) => {
				if (!user) {
					req.flash('error', 'No account with that email found.');
					return res.redirect('/reset');
				}
				user.resetToken = token;
				user.resetTokenExpiration = Date.now() + 3600000;
				return user.save();
			})
			.then((result) => {
				res.redirect('/');
				transporter.sendMail({
					to: req.body.email,
					from: 'shop@node-complete.com',
					subject: 'Password reset',
					html: `
			  <p>You requested a password reset</p>
			  <p>Click this <a href="http://localhost:3001/reset/${token}">link</a> to set a new password.</p>
			`,
				});
			})
			.catch((err) => {
				console.log(err);
			});
	});
};

exports.getNewPassword = async (req, res, next) => {
	try {
		//expect the token from email to be in the route.
		//extract the token from route,
		// validate if their is a user with the token in the db
		// render a form for the user to reset password

		const token = req.params.token;
		const user = await User.findOne({
			resetToken: token,
			resetTokenExpiration: { $gt: Date.now() },
		});

		let message = req.flash('error');
		if (message.length > 0) {
			message = message[0];
		} else {
			message = null;
		}

		res.render('auth/new-password', {
			path: '/new-password',
			pageTitle: 'New Password',
			errorMessage: message,
			userId: user._id.toString(),
			passwordToken: token,
		});
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};
exports.postNewPassword = async (req, res, next) => {
	try {
		const newPassword = req.body.password;
		const userId = req.body.userId;
		const passwordToken = req.body.passwordToken;
		let resetUser;

		const user = await User.findOne({
			resetToken: passwordToken,
			resetTokenExpiration: { $gt: Date.now() },
			_id: userId,
		});

		if (user) {
			resetUser = user;

			const hashedPassword = await bcrypt.hash(newPassword, 12);
			resetUser.password = hashedPassword;
			resetUser.resetToken = undefined;
			resetUser.resetTokenExpiration = undefined;

			const resetedUser = await resetUser.save();
			const result = await resetedUser;

			if (result) {
				res.redirect('/login');
			}
		}
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};
