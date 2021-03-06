const fs = require('fs');
const xml2js = require('xml2js');
const mongoose = require('mongoose');
const moment = require('moment');
require('mongodb-moment')(moment);
const path = require("path");
const _ = require("underscore");
const filePath = "//200.72.154.98/d$/MICROS/OPERA/export/OPERA/htj/";
const Schema = mongoose.Schema;

// Database connection
async function Connection() {
	return mongoose.connect('mongodb://admin:2Rm3tuuarWMwV@52.70.193.254:27017/bulletproof-nodejs', {
		useNewUrlParser: true,
		useUnifiedTopology: true
	})
}

async function closeConnection() {
	mongoose.connection.close()
}

async function GetlastOne(dir) {
	let files = fs.readdirSync(dir);
	// use underscore for max()
	let file = _.max(files, (f) => {
		var fullpath = path.join(dir, f);
		// ctime = creation time is used
		// replace with mtime for modification time
		return fs.statSync(fullpath).ctime;
	});

	let extension = file.split('.')
	console.log('extension: ', extension)

	if (extension[1] !== 'xml') {
		return -1
	}
	return dir + file
}

async function filteringRooms(json) {

	let day = parseInt(moment().format('D'), 10)
	let specificIndex = day - 2
	let rooms = json.DETAIL_AVAIL.LIST_G_5[0].G_5[0].LIST_DAY[0].DAY
	let roomsFromToday = rooms.filter((value, index) => index >= specificIndex);
	return roomsFromToday.map(q => {
		let d = q.BUSINESS_DATE[0].split('-')
		return {
			BUSINESS_DATE: q.BUSINESS_DATE[0] !== 'Total Available' ? moment(`20${d[2]}-${d[1]}-${d[0]}`).format('YYYY-MM-DD') : null,
			LIST_ROOM_TYPE: q.LIST_ROOM_TYPE[0].ROOM_TYPE.map(z => {
				return {
					MARKET_CODE: z.MARKET_CODE[0],
					DETAIL: z.LIST_DETAIL[0].DETAIL[0].NO_OF_ROOMS1[0]
				}
			})
		}
	})
}

async function getJson(file) {

	fs.readFile(file, async function (err, data) {
		if (err) console.log(err);

		const parser = new xml2js.Parser();
		parser.parseString(data, async function (err, result) {
			if (err) console.log(err);

			console.log('we got the json');
			console.log('we are filtering...', typeof result)
			let availableRooms = await filteringRooms(result);
			console.log('we are saving...')
			saveJson(availableRooms)
		});
	});

}

async function saveJson(data) {

	const parentSchema = new Schema({
		BUSINESS_DATE: { type: Date },
		LIST_ROOM_TYPE: [{ MARKET_CODE: String, DETAIL: Number }],

	});

	// User model
	const Room = mongoose.model('Rooms', parentSchema);

	console.log('Droping collection')
	Room.collection.drop();

	// Function call
	Room.insertMany(data).then(function () {
		console.log("Data inserted")  // Success
		closeConnection();
		process.exit(1);
	}).catch(function (error) {
		console.log(error)      // Failure
		process.exit(1);
	});

}

async function main() {

	Connection();
	console.log('Connected to mongo')

	setInterval(async function () {
		let date = new Date();
		if (date.getSeconds() === 0) {
			let file = await GetlastOne(filePath)
			if (file !== -1) {
				console.log(`extracting the next file: ${file}`)
				getJson(file);

			} else {
				console.log(file, ' is not a json.')
				process.exit(1)
			}
		}
	}, 2000);
}

main();
