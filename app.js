const express = require('express'),
      app = express(),
      childProcess = require('child_process'),
      fs = require('fs');
      bodyParser = require('body-parser');


app.use(bodyParser.json({ limit: '50mb', extended: true }))
app.use(bodyParser.urlencoded({limit: '50mb', extended: true }));

app.get('/', (req, res) => {
    // console.log(pythonProcess);
    // console.log("yo");
    // pythonProcess.stdout.on('data', (data) => {
    //     console.log(data.toString());
    // });
    res.send('Hey..');
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
                            console.log(result);
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

app.listen(3000, () => {
    console.log("Server started.. 3000");
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
        const arg1 = "--graph=./ml_model/tf_files_2/retrained_graph.pb",
              arg2 = "--image=./images/" + fileName, 
              arg3 = "--label=./ml_model/tf_files_2/retrained_labels.txt";
        var object;
        const pythonProcess = childProcess.spawn('python', ["./ml_model/scripts/label_image.py", arg1, arg2, arg3]);
        console.log("Starting prediction");
        pythonProcess.stdout.on('data', (data) => {
            parseArray(data.toString())
                .then((result) => {
                    resolve(result);
                })
        });
    })
    // console.log("Got here");
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