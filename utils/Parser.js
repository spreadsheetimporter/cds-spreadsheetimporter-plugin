const Util = require("./Util");
const cds = require('@sap/cds');

module.exports =  class Parser {
	// static parseSpreadsheetData(sheetData: ArrayData, typeLabelList: ListObject, component: Component, messageHandler: MessageHandler, util: Util, isODataV4: Boolean) {
	static parseSpreadsheetData(sheetData, typeLabelList) {
		const payloadArray = [];
		// loop over data from spreadsheet file
		for (const [index, row] of sheetData.entries()) {
			let payload = {};
			// check each specified column if availalble in spreadsheet data
			// for (const [columnKey, metadataColumn] of typeLabelList.entries()) {
			for (const col in typeLabelList) {
                const columnKey = col;
                const metadataColumn = typeLabelList[col];
				// depending on parse type
				const value = row[col];//[metadataColumn.label];//Util.getValueFromRow(row, metadataColumn.label, columnKey, component.getFieldMatchType());
				// depending on data type
				if (value && value.rawValue !== undefined && value.rawValue !== null && value.rawValue !== "") {
					const rawValue = value.rawValue;
					if (metadataColumn.type === "cds.Boolean") {
						if (typeof rawValue === "boolean" || rawValue === "true" || rawValue === "false") {
							payload[columnKey] = Boolean(rawValue);
						} else {

							// this.addMessageToMessages("spreadsheetimporter.valueNotABoolean", util, messageHandler, index, [metadataColumn.label], rawValue);
						}
					} else if (metadataColumn.type === "cds.Date") {
						let date = rawValue;
						if (value.sheetDataType !== "d") {
							const parsedDate = new Date(rawValue);
							if (isNaN(parsedDate.getTime())) {
								// this.addMessageToMessages("spreadsheetimporter.invalidDate", util, messageHandler, index, [metadataColumn.label], rawValue);
								continue;
							}
							date = parsedDate;
						}
						try {
							this.checkDate(date, metadataColumn, index);
							const dateString = `${date.getUTCFullYear()}-${("0" + (date.getUTCMonth() + 1)).slice(-2)}-${("0" + date.getUTCDate()).slice(-2)}`;
							payload[columnKey] = dateString;
						} catch (error) {
							// this.addMessageToMessages("spreadsheetimporter.errorWhileParsing", util, messageHandler, index, [metadataColumn.label], rawValue);
						}
					} else if (metadataColumn.type === "cds.DateTimeOffset" || metadataColumn.type === "cds.DateTime") {
						let date = rawValue;
						if (value.sheetDataType !== "d") {
							const parsedDate = new Date(rawValue);
							if (isNaN(parsedDate.getTime())) {
								// this.addMessageToMessages("spreadsheetimporter.invalidDate", util, messageHandler, index, [metadataColumn.label], rawValue);
								continue;
							}
							date = parsedDate;
						}
						try {
							this.checkDate(date, metadataColumn, index);
							if(!metadataColumn.precision){
								// If precision is not defined, remove milliseconds from date (from '2023-11-25T00:00:00Z' to '2023-11-25T00:00:00.000Z')
								// see https://github.com/spreadsheetimporter/ui5-cc-spreadsheetimporter/issues/600
								payload[columnKey] = date.toISOString().replace(/\.\d{3}/, '')
							} else {
								payload[columnKey] = date;
							}
						} catch (error) {
							// this.addMessageToMessages("spreadsheetimporter.errorWhileParsing", util, messageHandler, index, [metadataColumn.label], rawValue);
						}
					} else if (metadataColumn.type === "cds.TimeOfDay" || metadataColumn.type === "cds.Time") {
						let date = rawValue;

						// Only try to parse as Date if it's not marked as a date in sheet data
						if (value.sheetDataType !== "d") {
							date = new Date(rawValue);
						}

						if (date && !isNaN(date.getTime())) {
							// Successfully parsed to Date, format to only time part
							const timeFormatted = date.toISOString().substring(11, 19);
							payload[columnKey] = timeFormatted;
						} else {
							// Call the new method to parse time pattern if excel data is text not date
							const parsedTime = this.parseTimePattern(rawValue, index, metadataColumn);
							if (parsedTime) {
								payload[columnKey] = parsedTime;
							}
						}
					} else if (
						metadataColumn.type === "cds.UInt8" ||
						metadataColumn.type === "cds.Int16" ||
						metadataColumn.type === "cds.Int32" ||
						metadataColumn.type === "cds.Integer" ||
						metadataColumn.type === "cds.Int64" ||
						metadataColumn.type === "cds.Integer64" ||
						metadataColumn.type === "cds.Byte" ||
						metadataColumn.type === "cds.SByte"
					) {
						try {
							const valueInteger = this.checkInteger(value, metadataColumn, index);
							// according to odata v2 spec, integer values are strings, v4 are numbers
							// if (isODataV4) {
								// int64 are always strings
								if (metadataColumn.type === "cds.Int64" || metadataColumn.type === "cds.Integer64") {
									payload[columnKey] = valueInteger.toString();
								} else {
									payload[columnKey] = valueInteger;
								}
							// } else {
							// 	// for OData V2
							// 	if (metadataColumn.type === "cds.Int16" || metadataColumn.type === "cds.Int32" || metadataColumn.type === "cds.Byte" || metadataColumn.type === "cds.SByte") {
							// 		payload[columnKey] = valueInteger;
							// 	} else {
							// 		payload[columnKey] = valueInteger.toString();
							// 	}
							// }
						} catch (error) {
							// this.addMessageToMessages("spreadsheetimporter.errorWhileParsing", util, messageHandler, index, [metadataColumn.label], rawValue);
						}
					} else if (metadataColumn.type === "cds.Double" || metadataColumn.type === "cds.Decimal") {
						try {
							const valueDouble = this.checkDouble(value, metadataColumn, index);
							// according to odata v2 spec, integer values are strings, v4 are numbers
							// if (isODataV4) {
								if (metadataColumn.type === "cds.Double") {
									payload[columnKey] = valueDouble;
								}
								if (metadataColumn.type === "cds.Decimal") {
									payload[columnKey] = valueDouble.toString();
								}
							// } else {
							// 	// for OData V2
							// 	payload[columnKey] = valueDouble.toString();
							// }
						} catch (error) {
							// this.addMessageToMessages("spreadsheetimporter.errorWhileParsing", util, messageHandler, index, [metadataColumn.label], rawValue);
						}
					} else {
						// assign "" only if rawValue is undefined or null
						payload[columnKey] = `${rawValue ?? ""}`;
					}
				}
			}
			// if (component.getSpreadsheetRowPropertyName()) {
			// 	// @ts-ignore
			// 	payload[component.getSpreadsheetRowPropertyName()] = row["__rowNum__"] + 1;
			// }
			payloadArray.push(payload);
		}
		return payloadArray;
	}

	// static checkDate(value: any, metadataColumn: Property, util: Util, messageHandler: MessageHandler, index: number) {
	static checkDate(value, metadataColumn, index) {
		if (isNaN(value.getTime())) {
			// this.addMessageToMessages("spreadsheetimporter.invalidDate", util, messageHandler, index, [metadataColumn.label], value.rawValue);
			return false;
		}
		return true;
	}

	// static checkDouble(value: ValueData, metadataColumn: Property, util: Util, messageHandler: MessageHandler, index: number, component: Component) {
	static checkDouble(value, metadataColumn, index) {
		const rawValue = value.rawValue;
		let valueDouble = rawValue;
		if (typeof rawValue === "string") {
			const normalizedString = Util.normalizeNumberString(rawValue,  ',');
			valueDouble = parseFloat(normalizedString);
			// check if value is a number a does contain anything other than numbers and decimal seperator
			if (/[^0-9.,]/.test(valueDouble) || parseFloat(normalizedString).toString() !== normalizedString) {
				// Error: Value does contain anything other than numbers and decimal seperator
				// this.addMessageToMessages("spreadsheetimporter.parsingErrorNotNumber", util, messageHandler, index, [metadataColumn.label], rawValue);
			}
		}
		return valueDouble;
	}

	// static checkInteger(value: ValueData, metadataColumn: Property, util: Util, messageHandler: MessageHandler, index: number, component: Component) {
	static checkInteger(value, metadataColumn, index) {
		const rawValue = value.rawValue;
		let valueInteger = rawValue;
		if (!Number.isInteger(valueInteger)) {
			if (typeof rawValue === "string") {
				const normalizedString = Util.normalizeNumberString(rawValue, ',');
				valueInteger = parseInt(normalizedString);
				// check if value is a number a does contain anything other than numbers
				if (/[^0-9]/.test(valueInteger) || parseInt(normalizedString).toString() !== normalizedString.toString()) {
					// Error: Value does contain anything other than numbers
					// this.addMessageToMessages("spreadsheetimporter.parsingErrorNotWholeNumber", util, messageHandler, index, [metadataColumn.label], rawValue);
				}
			}
		}
		return valueInteger;
	}

	static addMessageToMessages(text, index,array, rawValue, formattedValue) {
        // req.reject(403,"spreadsheetimporter.parsingErrorNotNumber",["2"])
        cds.error({code:403,message:text,args:array})
		// messageHandler.addMessageToMessages({
		// 	title: util.geti18nText(text, array),
		// 	row: index + 2,
		// 	type: CustomMessageTypes.ParsingError,
		// 	counter: 1,
		// 	rawValue: rawValue,
		// 	formattedValue: formattedValue,
		// 	ui5type: MessageType.Error
		// });
	}

	/**
	 * Parses a time string according to specific patterns and returns the local time as a string.
	 * This method handles raw time strings and validates them against the expected format.
	 * The method supports time strings in the format "HH:mm:ss" and "HH:mm:ss.sss", where:
	 * - HH represents hours (00 to 23),
	 * - mm represents minutes (00 to 59),
	 * - ss represents seconds (00 to 59),
	 * - sss represents milliseconds (000 to 999).
	 *
	 * If the time string is valid and the components are within their respective ranges,
	 * it constructs a Date object and formats the time to respect the local timezone.
	 * If the time string does not match the expected pattern or components are out of range,
	 * it logs an appropriate error message.
	 *
	 * @param {string} rawValue - The raw time string to be parsed.
	 * @param {Util} util - Utility class instance for accessing helper functions like i18n.
	 * @param {MessageHandler} messageHandler - MessageHandler class instance for logging errors.
	 * @param {number} index - The row index of the data being parsed, used for error reporting.
	 * @param {Property} metadataColumn - The metadata for the column, including the type label.
	 * @returns {string|null} - Returns a formatted time string if successful, otherwise null.
	 */
	static parseTimePattern(rawValue, index, metadataColumn) {
		const timePattern = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?$/;
		const match = rawValue.match(timePattern);

		if (match) {
			const hours = parseInt(match[1], 10);
			const minutes = parseInt(match[2], 10);
			const seconds = match[3] ? parseInt(match[3], 10) : 0;
			const milliseconds = match[4] ? parseInt(match[4], 10) : 0;

			// Validate time components
			if (hours < 24 && minutes < 60 && seconds < 60) {
				// Construct a Date object from time components
				let today = new Date();
				today.setHours(hours, minutes, seconds, milliseconds);
				// Format the time considering the local timezone
				const timeFormatted = `${today.getHours().toString().padStart(2, "0")}:${today.getMinutes().toString().padStart(2, "0")}:${today.getSeconds().toString().padStart(2, "0")}`;
				return timeFormatted;
			} else {
				// this.addMessageToMessages("spreadsheetimporter.invalidTime", util, messageHandler, index, [metadataColumn.label], rawValue);
			}
		} else {
			// this.addMessageToMessages("spreadsheetimporter.invalidTimeFormat", util, messageHandler, index, [metadataColumn.label], rawValue);
		}
		return null;
	}
}