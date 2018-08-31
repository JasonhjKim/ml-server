const express = require('express'),
      app = express(),
      childProcess = require('child_process'),
      fs = require('fs');
      bodyParser = require('body-parser'),
      cors = require('cors'),
      mongoose = require('mongoose'),
      path = require('path');

const Prediction = require('./Prediction');

app.use(bodyParser.json({ limit: '50mb', extended: true }))
app.use(bodyParser.urlencoded({limit: '50mb', extended: true }));
app.use(cors());

app.get('/', (req, res) => {
    Prediction.find({}, (err, predict) => {
        if(err) return err;
        if(predict) {
            return res.json(predict)
        } else {
            return res.status(422).send({ error: 'No prediction found' })
        }
    })
});

app.post("/images", (req, res) => {
    // console.log(req.body.image);
    // var image = new Buffer(req.body.image, 'base64'.toString());
    console.log(req.body)
    console.log(req.params)
    const image = req.body.image
    base64Decode(image)
        .then((decodedImage) => {
            createFile(decodedImage)
                .then((fileName) => {
                    predict(fileName)
                        .then((result) => {
                            console.log("This is the result: " + result);
			    console.log(result.fork)
			    console.log(image);
			    const newPrediction = new Prediction({
			        fork: result.fork,
                    knife: result.knife,
                    spoon: result.spoon,
                    img: image
   			    })
			    newPrediction.save(function(err){
				    if(err) return err;
			        })
                    var json = JSON.parse(JSON.stringify(result));
                    res.json(json);
                    })
                })
        })
    // const decodedImage = base64Decode(image);
    // const fileName = createFile(decodedImage);
    // const object = predict(fileName);
    // console.log(object);
})

app.get("/reroute", (req, res) => {
    routeImageFiles();
})

app.listen(3000, () => {
    console.log("Server started.. 3000");
})

mongoose.connect('mongodb://jason:khj007@ds141185.mlab.com:41185/predictions', {useNewUrlParser: true}, () => {
    console.log("Database running on... " + 41185);
})

function base64Decode(base64) {
    return new Promise((resolve, reject) => {
        const phase1 = base64.replace(/^data:image\/\w+;base64,/, "");
        // const phase2 = phase1.replace('+', " ");
        console.log("Done decoding");
        resolve(new Buffer(phase1, 'base64'));
    })
}

function predict(fileName) {
    return new Promise((resolve, reject) => {
        const arg1 = "--graph=./models/retrained_graph.pb",
              arg2 = "--image=./images/" + fileName, 
              arg3 = "--label=./models/retrained_labels.txt";
        var object;
        const pythonProcess = childProcess.spawn('python', ["./scripts/label_image.py", arg1, arg2, arg3]);
        console.log("Starting prediction");
        console.log(fileName);
        pythonProcess.stdout.on('data', (data) => {
            parseArray(data.toString())
                .then((result) => {
                    console.log(fileName);
                    const classification = highestItem(result);
                    rename(fileName, classification, "./images/");
                    resolve(result);
                })
        });
    })
    // console.log("Got here");
}

function train() {
    return new Promise((resolve, reject) => {
        const arg1 = "-m scripts.retrain,",
              arg2 = "--bottleneck_dir=tf_files_2/bottlenecks",
              arg3 = "--how_many_training_steps=1000",
              arg4 = "--model_dir=tf_files_2/models/"
              arg5 = "--summaries_dir=tf_files_2/training_summaries/'mobilenet_0.50_224'",
              arg6 = "--output_graph=tf_files_2/retrained_graph.pb",
              arg7 = "--output_labels=tf_files_2/retrained_labels.txt",
              arg8 = "--architecture='mobilenet_0.50_224'"
              arg9 = "--image_dir=tf_files_2/images/"
        const pythonProcess = childProcess.spawn('python', [arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9]);
        python 
    })
}

function createFile(image) {
    // var decodedImage = new Buffer(image, 'base64').toString('binary');
    return new Promise((resolve, reject) => {
        const random = Math.floor(Math.random() * 100000);
        const fileName = "image" + random + ".jpg"
        fs.writeFile("./images/" + fileName, image, "base64", (err) => {
            if (err) {
                console.log("err0r: " + err);
            } else {
                console.log("Saved succesful");
                console.log(fileName);
                resolve(fileName);
                // return fileName
            }
        })
        return false;
    })
}

function parseArray(dirtyData) {
    console.log(dirtyData);
    return new Promise((resolve, reject) => {
        const checkArray = ["fork", "spoon", "knife", "score="];
        const firstArray = dirtyData.split(/[\r\n\s]|$/);
        const returnArr = [];
        for(let i = 0; i < firstArray.length; i++) {
            for(let j = 0; j < checkArray.length; j++) {
                if(firstArray[i].includes(checkArray[j])) {
                    returnArr.push(firstArray[i]);
                }
            }
        }
        console.log(returnArr);
    
        /* 1 = spoon
         * 2 = (score=0.99);
         * 3 = fork
         * 4 = (score=0.99);
         * 5 = knife
         * 6 = (score=0.99);
         */
        const returnObject = {}
        for(let i = 0; i < returnArr.length; i+=2) {
            if(i + 1 % 2 === 0) {
                // Even Case
            } else {
                // Odd Case
                const indexString = returnArr[i].toString();
                const percentageString = returnArr[i+1];
                const equalIndex = percentageString.indexOf("=");
                const endBracketIndex = percentageString.indexOf(")");
                returnObject[indexString] = percentageString.substring(equalIndex + 1, endBracketIndex).toString();
            }
        }
        resolve(returnObject);
    })
}

function highestItem(array) {
    if(array.length != 0) {
        const max = Math.max(array["spoon"], array["fork"], array["knife"]);
	console.log(array["spoon"] + " " + array["fork"])
        console.log(array["spoon"] < array["fork"])
        if (array["spoon"] > array["fork"]) {
            if(array["spoon"] > array["knife"]) {
                console.log("Spoon case")
                return "spoon";
            } else {
                console.log("Knife case")
                return "knife"
            }
        } else {
            if(array["fork"] > array["knife"]) {
                console.log("Fork case")
                return "fork"
            } else {
                console.log("Knife case")
                return "knife";
            }
        }
    }
    return -1;
}

function rename(oldFileName, newFileClass, path) {
    const random = Math.floor(Math.random() * 100000);
    const extension = ".jpg"
    const newFilePath = path + newFileClass + random + extension
    fs.rename(path + oldFileName, newFilePath, () => {
        console.log("******************************")
        console.log("File " + oldFileName + " changed to " + newFilePath)
        console.log("******************************")
    })
}


function routeImageFiles() {
    const originPath = "./images/";
    const forkPath = "./train_images/fork/"
    const knifePath = "./train_images/knife/"
    const spoonPath = "./train_images/spoon/"

    const files = fs.readdirSync(originPath);
    for (var i in files) {
        if (path.extname(files[i]) == ".jpg") {
            if (files[i].includes("spoon")) {
                console.log("Spoon: " + files[i])
            }

            if (files[i].includes("fork")) {
                console.log("Fork: " + files[i])
            }

            if (files[i].includes("knife")) {
                console.log("Knife: " + files[i])
            }
        }
    }
}