const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const fs = require('fs');
const dotenv = require('dotenv');

const app = express();


app.use("*",cors({
  origin: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

//setting up config file
dotenv.config({path:'config.env'})


// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Add your AWS access key
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Add your AWS secret key
  region: process.env.AWS_REGION // Add your AWS region
});


const s3 = new AWS.S3();


// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) =>{
  res.send("Welcome to the Consensus Hackathon!")
})

app.get('/list', (req, res) => {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME // Add your bucket name
    };
  
    s3.listObjectsV2(params, (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error fetching data from S3');
      }


  
      res.send(data.Contents);
    });
  });

app.get("/video/:key", (req, res) => {
    const key = req.params.key;

    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
    };

    // s3.getObject(params, (err, data) => {
    //     if (err) {
    //     console.error(err);
    //     return res.status(500).send('Error retrieving the object');
    //     }

    //     // Return the object data
    //     res.setHeader('Content-Type', data.ContentType);
    //     res.send(data.Body).json();
    // });

    s3.getSignedUrl('getObject', params, (err, url) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Error generating signed URL');
        }
    
        // Return the pre-signed URL
        res.send({ url });
      });
})



app.post('/upload', upload.single('file'), (req, res) => {
  // Read the file from the file system
  const fileContent = fs.readFileSync(req.file.path);
  
  // Set up S3 upload parameters
  const params = {
    Bucket: process.env.S3_BUCKET_NAME, // Add your bucket name
    Key: req.file.originalname, // File name you want to save as in S3
    Body: fileContent,
    ContentType: req.file.mimetype
  };

  // Uploading files to the bucket
  s3.upload(params, (err, data) => {
    if (err) {
      throw err;
    }
    console.log(`File uploaded successfully. ${data.Location}`);
    res.send(`File uploaded successfully. ${data.Location}`);
  });
});

app.listen(process.env.PORT, () => {
  console.log(`Server running at http://localhost:${process.env.PORT}`);
});
