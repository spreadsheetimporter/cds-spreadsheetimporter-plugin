module.exports = class Util {

	constructor() {
	
	}

	static getValueFromRow(row, label, type) {
		let value;
		// if (fieldMatchType === "label") {
			value = row[label];
		// }
		// if (fieldMatchType === "labelTypeBrackets") {
		// 	try {
		// 		value = Object.entries(row).find(([key]) => key.includes(`[${type}]`))[1] as ValueData;
		// 	} catch (error) {
		// 		Log.debug(`Not found ${type}`, undefined, "SpreadsheetUpload: Util");
		// 	}
		// }
		return value;
	}

	static changeDecimalSeperator(value) {
		// Replace thousands separator with empty string
		value = value.replace(/[.]/g, "");
		// Replace decimal separator with a dot
		value = value.replace(/[,]/g, ".");
		// Convert string to number
		return parseFloat(value);
	}


	static getBrowserDecimalAndThousandSeparators(defaultDecimalSeparator) {
		let decimalSeparator = "";
		let thousandSeparator = "";
		if (defaultDecimalSeparator === ",") {
			thousandSeparator = ".";
			decimalSeparator = ",";
			return { thousandSeparator, decimalSeparator };
		}
		if (defaultDecimalSeparator === ".") {
			thousandSeparator = ",";
			decimalSeparator = ".";
			return { decimalSeparator, thousandSeparator };
		}
		const sampleNumber = 12345.6789;
		const formatted = new Intl.NumberFormat(navigator.language).format(sampleNumber);

		const withoutDigits = formatted.replace(/\d/g, "");
		decimalSeparator = withoutDigits.charAt(withoutDigits.length - 1);
		thousandSeparator = withoutDigits.charAt(0);

		return { decimalSeparator, thousandSeparator };
	}

	static normalizeNumberString(numberString,defaultDecimalSeparator) {
		const { decimalSeparator, thousandSeparator } = this.getBrowserDecimalAndThousandSeparators(defaultDecimalSeparator);

		// Remove thousand separators
		const stringWithoutThousandSeparators = numberString.replace(new RegExp(`\\${thousandSeparator}`, "g"), "");

		// Replace the default decimal separator with the standard one
		const standardNumberString = stringWithoutThousandSeparators.replace(decimalSeparator, ".");

		return standardNumberString;
	}

	static getRandomString(length) {
		const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		let randomString = "";

		for (let i = 0; i < length; i++) {
			const randomIndex = Math.floor(Math.random() * characters.length);
			randomString += characters.charAt(randomIndex);
		}

		return randomString;
	}

	static stringify(ob) {
		const seen = new WeakSet();

		return JSON.stringify(obj, (key, value) => {
			// Check if value is an object and not null
			if (typeof value === "object" && value !== null) {
				// Handle circular references
				if (seen.has(value)) {
					return;
				}
				seen.add(value);

				// Handle first-level objects
				const keys = Object.keys(value);
				if (keys.every((k) => typeof value[k] !== "object" || value[k] === null)) {
					let simpleObject = {};
					for (let k in value) {
						if (typeof value[k] !== "object" || value[k] === null) {
							simpleObject[k] = value[k];
						}
					}
					return simpleObject;
				}
			}
			return value;
		});
	}

	static extractObjects(objects)  {
		return objects.map((obj) => obj.getObject());
	}
}