const fs = require('fs');
const path = require('path');
const stripeClient = require('stripe')(
	'sk_test_51IMxjHCk1PQxgv0nUyMX0jd38s1iIayWBnffcndzlzcfdFAFWnVkWrsFOUMxAV7euKZ4rKG1nDIp0bGbhcgp5zzF00shwS2eRu'
);
// const stripe = require('stripe')(
// 	'sk_test_51GrH3aHHKcYX5bssXjxNMpispPzz2NztlclPSo8HL8UjE2ZWmTUx98XpKyWIrid3jmGP9TobPlniX0myk6DlRAqU00l070iksQ'
// );

const PDFDocument = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');
const { ReturnDocument } = require('mongodb');

exports.getProducts = async (req, res, next) => {
	try {
		const products = await Product.find();

		console.log(products);
		res.render('shop/product-list', {
			prods: products,
			pageTitle: 'All Products',
			path: '/products',
		});
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

exports.getProduct = async (req, res, next) => {
	//router.get('/products/:productId' === req.params.productId  in the router folder.
	try {
		const product = await Product.findById(req.params.productId);

		console.log(product);
		res.render('shop/product-detail', {
			product: product,
			pageTitle: product.title,
			path: '/products',
		});
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

exports.getIndex = async (req, res, next) => {
	try {
		const products = await Product.find();

		console.log(products);
		res.render('shop/index', {
			prods: products,
			pageTitle: 'Shop',
			path: '/products',
			//isAuthenticated: req.session.isLoggedIn,
		});
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

exports.getCart = async (req, res, next) => {
	try {
		const user = await req.user.populate('cart.items.productId');
		const products = await user.cart.items;

		console.log(user.cart.items);
		res.render('shop/cart', {
			path: '/cart',
			pageTitle: 'Your Cart',
			products: products,
		});
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

exports.postCart = async (req, res, next) => {
	try {
		const prodId = req.body.productId;
		const product = await Product.findById(prodId);
		const result = await req.user.addToCart(product);
		// if (product) {
		// 	return req.user.addToCart(product);
		// }
		console.log(result);
		return res.redirect('/cart');
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

exports.postCartDeleteProduct = async (req, res, next) => {
	try {
		const prodId = req.body.productId;
		const result = await req.user.removeFromCart(prodId);
		if (!result) {
			console.log('Unable to return a cart for this user');
		}
		return res.status(204).redirect('/cart');
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

exports.getCheckout = async (req, res, next) => {
	try {
		const user = await req.user.populate('cart.items.productId');
		const products = await user.cart.items;
		let total = 0;
		products.forEach((p) => {
			total += p.quantity * p.productId.price;
		});

		const session = await stripeClient.checkout.sessions.create({
			payment_method_types: ['card'],
			line_items: products.map((p) => {
				return {
					name: p.productId.title,
					description: p.productId.description,
					amount: p.productId.price * 100,
					currency: 'usd',
					quantity: p.quantity,
				};
			}),
			success_url: req.protocol + '://' + req.get('host') + '/checkout/success', // => http://localhost:3000
			cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel',
		});

		//console.log(user.cart.items);
		console.log(session);

		res.render('shop/checkout', {
			path: '/checkout',
			pageTitle: 'Checkout',
			products: products,
			totalSum: total,
			// foward the sessionId in the view
			sessionId: session.id,
		});
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

exports.getCheckoutSuccess = async (req, res, next) => {
	try {
		const user = await req.user.populate('cart.items.productId');
		const products = await user.cart.items.map((i) => {
			return { quantity: i.quantity, product: { ...i.productId._doc } };
		});

		const order = new Order({
			user: {
				email: req.user.email,
				userId: req.user,
			},
			products: products,
		});
		//return order.save();
		const O = await order.save();
		const resultO = await O;

		if (resultO) {
			console.log('Created Order');
			//res.redirect('/orders');
		}

		// after the order is finish we auto delete the cart
		const result = () => {
			return req.user.clearCart();
		};

		const clearCartAfterOrder = await result();

		return res.status(204).redirect('/orders');
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

// exports.postOrder = async (req, res, next) => {
// 	try {
// 		// add order
// 		const user = await req.user.populate('cart.items.productId');
// 		const products = user.cart.items.map((i) => {
// 			// _doc comes from mongoose documentation
// 			return { quantity: i.quantity, product: { ...i.productId._doc } };
// 		});
// 		const order = new Order({
// 			user: {
// 				email: req.user.email,
// 				userId: req.user,
// 			},
// 			products: products,
// 		});
// 		const O = await order.save();
// 		const resultO = await O;

// 		if (resultO) {
// 			console.log('Created Order');
// 			//res.redirect('/orders');
// 		}

// 		// after the order is finish we auto delete the cart
// 		const result = () => {
// 			return req.user.clearCart();
// 		};

// 		const clearCartAfterOrder = await result();

// 		return res.status(204).redirect('/orders');
// 	} catch (err) {
// 		console.log(err);
// 		const error = new Error(err);
// 		error.httpStatusCode = 500;
// 		return next(error);
// 	}
// };

exports.getOrders = async (req, res, next) => {
	try {
		const orders = await Order.find({ 'user.userId': req.user._id });

		res.render('shop/orders', {
			path: '/orders',
			pageTitle: 'Your Orders',
			orders: orders,
			//isAuthenticated: req.session.isLoggedIn,
		});
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

exports.getInvoice = async (req, res, next) => {
	try {
		const orderId = req.params.orderId;
		const order = await Order.findById(orderId);
		if (!order) {
			return next(new Error('No order found.'));
		}
		// check if the user matches the user saved in the orderId.
		if (order.user.userId.toString() !== req.user._id.toString()) {
			return next(new Error('Unauthorized'));
		}

		const invoiceName = 'invoice-' + orderId + '.pdf';
		const invoicePath = path.join('data', 'invoices', invoiceName);

		// auto generate pdf based on the order and open in the browser 'inline'
		const pdfDoc = new PDFDocument();
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader(
			'Content-Disposition',
			'inline; filename="' + invoiceName + '"'
		);

		//streaming the respond data
		pdfDoc.pipe(fs.createWriteStream(invoicePath));
		pdfDoc.pipe(res);

		pdfDoc.fontSize(26).text('Invoice', {
			underline: true,
		});
		pdfDoc.text('-----------------------');
		let totalPrice = 0;
		order.products.forEach((prod) => {
			// total = the old total plus the quantity times price
			totalPrice = totalPrice + prod.quantity * prod.product.price;
			pdfDoc
				.fontSize(14)
				.text(
					prod.product.title +
						' - ' +
						prod.quantity +
						' x ' +
						'$' +
						prod.product.price
				);
		});
		pdfDoc.text('---');
		pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);

		pdfDoc.end();
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};
