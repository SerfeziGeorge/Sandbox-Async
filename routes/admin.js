const path = require('path');

const express = require('express');
const { check, body } = require('express-validator/check');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get('/products', isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post(
	'/add-product',
	[
		body('title', 'The title must contain at least 3 letters!')
			.isString()
			.isLength({ min: 3 })
			.trim(),
		//body('imageUrl', 'The image is mandatory!').isURL(),
		body(
			'price',
			'The product must have a price, and should not be equal or below zero'
		)
			.isFloat()
			.custom((value) => {
				return value >= 1;
			}),
		body('description', 'The title must be between  5 and 400 letters!')
			.isLength({ min: 5, max: 400 })
			.trim(),
	],
	isAuth,
	adminController.postAddProduct
);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post(
	'/edit-product',
	[
		body('title', 'The title must contain at least 3 letters!')
			.isString()
			.isLength({ min: 3 })
			.trim(),
		//body('imageUrl', 'The image is mandatory!').isURL(),
		body(
			'price',
			'The product must have a price, and should not be equal or below zero'
		)
			.isFloat()
			.custom((value) => {
				return value >= 1;
			}),
		body('description', 'The title must be between  5 and 400 letters!')
			.isLength({ min: 5, max: 400 })
			.trim(),
	],
	isAuth,
	adminController.postEditProduct
);

router.post('/delete-product', isAuth, adminController.postDeleteProduct);

module.exports = router;
