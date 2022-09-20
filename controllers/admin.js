const fileHelper = require('../util/file');

const { validationResult } = require('express-validator/check');
const Product = require('../models/product');

exports.getAddProduct = (req, res, next) => {
	res.render('admin/edit-product', {
		pageTitle: 'Add Product',
		path: '/admin/add-product',
		editing: false,
		hasError: false,
		errorMessage: null,
		validationErrors: [],
	});
};

exports.postAddProduct = async (req, res, next) => {
	try {
		const title = req.body.title;
		//const image = req.body.image;
		const image = req.file;
		const price = req.body.price;
		const description = req.body.description;

		if (!image) {
			return res.status(422).render('admin/edit-product', {
				pageTitle: 'Add Product',
				path: '/admin/add-product',
				editing: false,
				hasError: true,
				product: {
					title: title,
					price: price,
					description: description,
				},
				errorMessage: 'Attached file is not an image.',
				validationErrors: [],
			});
		}

		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			console.log(errors.array());
			return res.status(422).render('admin/add-product', {
				pageTitle: 'Add Product',
				path: '/admin/add-product',
				editing: false,
				hasError: true,
				product: {
					title: title,
					image: image,
					price: price,
					description: description,
				},
				errorMessage: errors.array()[0].msg,
				validationErrors: errors.array(),
			});
		}
		const images = image.path;
		const product = new Product({
			title: title,
			price: price,
			description: description,
			images: images,
			userId: req.user,
		});

		const p = await product.save();
		const result = await p;

		if (result) {
			console.log('Created Product');
			res.redirect('/admin/products');
		}
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		// when we call next with error passed as an arg, then it will skip all other middlewares and jump to an error handling middleware, source https://expressjs.com/en/guide/error-handling.html
		return next(error);
	}

	// 	product
	// 		.save()
	// 		.then((result) => {
	// 			// console.log(result);
	// 			console.log('Created Product');
	// 			res.redirect('/admin/products');
	// 		})
	// 		.catch((err) => {
	// 			console.log(err);
	// 		});
};

exports.getEditProduct = async (req, res, next) => {
	try {
		const editMode = req.query.edit;
		if (!editMode) {
			return res.redirect('/');
		}
		const prodId = req.params.productId;
		const product = await Product.findById(prodId);

		if (!product) {
			return res.redirect('/');
		}

		res.render('admin/edit-product', {
			pageTitle: 'Edit Product',
			path: '/admin/edit-product',
			editing: editMode,
			product: product,
			hasError: false,
			errorMessage: null,
			validationErrors: [],
		});
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

exports.postEditProduct = async (req, res, next) => {
	try {
		const prodId = req.body.productId;
		const updatedTitle = req.body.title;
		const updatedPrice = req.body.price;
		const image = req.file;
		//const updatedimage = req.body.image;
		const updatedDesc = req.body.description;

		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			console.log(errors.array());
			return res.status(422).render('admin/edit-product', {
				pageTitle: 'Edit Product',
				path: '/admin/edit-product',
				editing: true,
				hasError: true,
				product: {
					title: updatedTitle,
					//image: updatedimage,
					price: updatedPrice,
					description: updatedDesc,
					_id: prodId,
				},
				errorMessage: errors.array()[0].msg,
				validationErrors: errors.array(),
			});
		}

		const product = await Product.findById(prodId);
		if (product.userId.toString() !== req.user._id.toString()) {
			return res.redirect('/');
		}
		product.title = updatedTitle;
		product.price = updatedPrice;
		product.description = updatedDesc;
		if (image) {
			//delete old image
			fileHelper.deleteFile(product.imageUrl);
			product.imageUrl = image.path;
		}

		const p = await product.save();
		const result = await p;

		if (result) {
			console.log('UPDATED PRODUCT!');
			res.redirect('/admin/products');
		}
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

exports.getProducts = async (req, res, next) => {
	try {
		const products = await Product.find();

		res.render('admin/products', {
			prods: products,
			pageTitle: 'Admin Products',
			path: '/admin/products',
			//isAuthenticated: req.session.isLoggedIn,
		});
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};

exports.postDeleteProduct = async (req, res, next) => {
	try {
		const prodId = req.body.productId;
		const product = await Product.findById(prodId);

		if (!product) {
			//console.log('Unable to return a product with this id');
			return next(new Error('Unable to return a product with this id.'));
		}
		// delete the pic
		fileHelper.deleteFile(product.images);
		// delete the product

		const foundandDeleteProduct = await Product.deleteOne({
			_id: prodId,
			userId: req.user._id,
		});

		return res.status(204).redirect('/admin/products');
	} catch (err) {
		console.log(err);
		const error = new Error(err);
		error.httpStatusCode = 500;
		return next(error);
	}
};
