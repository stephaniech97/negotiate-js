/**
 * Negotiate.js
 * 
 * @fileOverview HTTP Content Negotiation in JavaScript
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @version 0
 */

/*
 * Copyright 2010 Gary Court. All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 * 
 *    1. Redistributions of source code must retain the above copyright notice, this list of
 *       conditions and the following disclaimer.
 * 
 *    2. Redistributions in binary form must reproduce the above copyright notice, this list
 *       of conditions and the following disclaimer in the documentation and/or other materials
 *       provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY GARY COURT ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GARY COURT OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*jslint white: true, onevar: true, undef: true, eqeqeq: true, newcap: true, immed: true, sub: true */

var exports = exports || this,
	require = require || function () {
		return exports;
	};

(function () {
	
	var O = {};
	
	function typeOf(o) {
		return o === undefined ? 'undefined' : (o === null ? 'null' : Object.prototype.toString.call(o).split(' ').pop().split(']').shift().toLowerCase());
	}
	
	function isNumeric(o) {
		return typeof o === "number" || (typeof o === "string" && /^\s*-?(0x)?\d+(.\d+)?\s*$/.test(o));
	}
	
	function F() {}
	function delegateObject(obj) {
		F.prototype = obj;
		return new F();
	}
	
	function toArray(o) {
		return o !== undefined && o !== null ? (o instanceof Array && !o.callee ? o : (typeof o.length !== 'number' || o.split || o.setInterval || o.call ? [ o ] : Array.prototype.slice.call(o))) : [];
	}
	
	function clone(obj, deep) {
		var newObj, x;
		
		switch (typeOf(obj)) {
		case 'undefined':
			return;
		case 'null':
			return null;
		case 'boolean':
			return !!obj;
		case 'number':
			return +obj;
		case 'string':
			return '' + obj;
		case 'object':
			if (deep) {
				newObj = {};
				for (x in obj) {
					if (obj[x] !== O[x]) {
						newObj[x] = clone(obj[x], deep);
					}
				}
				return newObj;
			} else {
				return delegateObject(obj);
			}
			break;
		case 'array':
			if (deep) {
				newObj = new Array(obj.length);
				x = obj.length;
				while (--x >= 0) {
					newObj[x] = clone(obj[x], deep);
				}
				return newObj;
			} else {
				return Array.pototype.slice.call(obj);
			}
			break;
		case 'function':
			newObj = function () {
				return obj.apply(this, arguments);
			};
			F.prototype = undefined;
			for (x in obj) {
				if (obj[x] !== F[x]) {
					newObj[x] = clone(obj[x], deep);
				}
			}
			return newObj;
		case 'regexp':
			return new RegExp(obj);
		case 'date':
			return new Date(obj);
		}
	}
	
	function uc(str, deflt) {
		return (str || deflt || '').toUpperCase();
	}
	
	function lc(str, deflt) {
		return (str || deflt || '').toLowerCase();
	}
	
	function parseHeaderElements(headerValue) {
		//TODO
	}
	
	function choose(variants, request) {
		var y, yl, x, xl, headers, variant, accepts, variantValue, requestValue, params, q;
		
		variants = clone(variants, true);
		headers = {
			method : uc(request['method'], 'GET'),
			acceptType : parseHeaderElements(request['accept']),
			acceptLanguage : parseHeaderElements(request['accept-language']),
			acceptCharset : parseHeaderElements(request['accept-charset']),
			acceptEncoding : parseHeaderElements(request['accept-encoding'])
		};
		
		for (y = 0, yl = variants.length; y < yl; ++y) {
			variant = variants[y];
			
			//quality of request method
			variantValue = uc(variant['method'], 'GET');
			if (variantValue === headers.method) {
				variant.qm = 1.0;
			} else if (headers.method === 'HEAD' && variantValue === 'GET') {
				variant.qm = 0.5;
			} else {
				variant.qm = 0.0;
			}
			
			//quality of media type
			accepts = headers.acceptType;
			variantValue = lc(variant['type']);
			if (accepts.length) {
				for (x = 0, xl = accepts.length; x < xl; ++x) {
					requestValue = accepts[x][0];
					params = accepts[x][1];
					
					if (requestValue === '*' || requestValue === '*/*' || requestValue === variantValue || (/^(.+\/)\*$/.test(requestValue) && variantValue.indexOf(RegExp.$1) === 0)) {
						q = (typeof params === 'object' && isNumeric(params.q) ? parseFloat(params.q, 10) : 1.0);
						
						//check if the size of the variant exceeds the maximum allowed bytes for this media type.
						if (typeof variant['length'] === 'number' && typeof params === 'object' && isNumeric(params.mxb) && parseFloat(params.mxb, 10) < variant['length']) {
							q = 0.0;
						}
					} else {
						q = 0.0;
					}
					
					variant.qt = Math.max(variant.qt || 0, q);
				}
			} else {
				variant.qt = 1.0;
			}
			
			//quality of language
			accepts = headers.acceptLanguage;
			variantValue = lc(variant['language']);
			if (!variantValue) {
				variant.ql = 0.5;
			} else if (accepts.length) {
				for (x = 0, xl = accepts.length; x < xl; ++x) {
					requestValue = accepts[x][0];
					params = accepts[x][1];
					
					if (requestValue === '*' || requestValue === variantValue || (/^([a-z]+)\-[a-z]+$/.test(requestValue) && variantValue === RegExp.$1)) {
						q = (typeof params === 'object' && isNumeric(params.q) ? parseFloat(params.q, 10) : 1.0);
					} else {
						q = 0.001;  //never disqualify solely on language
					}
					
					variant.ql = Math.max(variant.ql || 0, q);
				}
			} else {
				variant.ql = 1.0;
			}
			
			//quality of charset
			accepts = headers.acceptCharset;
			variantValue = lc(variant['charset']);
			if (!variantValue) {
				variant.qc = 1.0;
			} else if (accepts.length) {
				for (x = 0, xl = accepts.length; x < xl; ++x) {
					requestValue = accepts[x][0];
					params = accepts[x][1];
					
					if (requestValue === '*' || requestValue === variantValue) {
						q = (typeof params === 'object' && isNumeric(params.q) ? parseFloat(params.q, 10) : 1.0);
					} else {
						q = 0.0;
					}
					
					variant.qc = Math.max(variant.qc || 0, q);
				}
			} else {
				variant.qc = 1.0;
			}
			
			//quality of encoding
			accepts = headers.acceptEncoding;
			variantValue = lc(variant['encoding']);
			if (!variantValue) {
				variant.qe = 1.0;
			} else if (accepts.length) {
				for (x = 0, xl = accepts.length; x < xl; ++x) {
					requestValue = accepts[x][0];
					params = accepts[x][1];
					
					if (requestValue === '*' || requestValue === variantValue) {
						q = (typeof params === 'object' && isNumeric(params.q) ? parseFloat(params.q, 10) : 1.0);
					} else {
						q = 0.0;
					}
					
					variant.qe = Math.max(variant.qe || 0, q);
				}
			} else {
				variant.qe = 1.0;
			}
			
			//quality of source
			variant.qs = variant['quality'] || 1.0;
			
			//total quality score
			variant.q = variant.qm * variant.qt * variant.ql * variant.qc * variant.qe * variant.qs;
		}
		
		variants.sort(function (a, b) {
			return b.q - a.q;
		});
		
		return variants;
	}
	
	this.Negotiate = {
		choose : choose
	};
	
	exports.choose = choose;
	
}());