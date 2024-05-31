const express = require('express');
const cors = require('cors');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const fs = require('fs');
const dotenv = require('dotenv');

const app = express();

let idCounter = 100

const posts = [{
  id: idCounter++,
  address:"0xf4b3eff2571e1bf058493d59aa053fcf0db023e7e23cd24b7eb0235279ac9364",
  video:{
    location:"https://conshack.s3.us-east-2.amazonaws.com/WhatsApp%20Video%202024-05-11%20at%2010.28.27%20AM.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIASFEBHVXT3AQM6NOO%2F20240531%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Date=20240531T054946Z&X-Amz-Expires=900&X-Amz-Signature=c7f8a872f6d9eab71e0e5e25d0ccb96d81b3955bb73cc364ae7742f74903a18b&X-Amz-SignedHeaders=host",
    name:"WhatsApp Video 2024-05-11 at 10.28.27 AM.mp4"
  },
  upvotes: 134
},{
  id: idCounter++,
  address:"0xf4b3eff2571e1bf058493d59aa053fcf0db023e7e23cd24b7eb0235279ac9364",
  video:{
    location:"https://conshack.s3.us-east-2.amazonaws.com/blob?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIASFEBHVXT3AQM6NOO%2F20240531%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Date=20240531T054539Z&X-Amz-Expires=900&X-Amz-Signature=bb594b17a06f4c0eac8a69230892019010bd4b644543d616304ef276647c61de&X-Amz-SignedHeaders=host",
    name:"blob"
  },
  upvotes: 96
}]

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

app.get('/feed', async (req, res) => {
  let results = []
  for(let i = 0; i < posts.length; i++){
    const key = posts[i].video.name;

    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
    };

    let r = await s3.getSignedUrl('getObject', params);
    results.push({
      id: posts[i].id,
      address: posts[i].address,
      videoUrl: r,
      upvotes: posts[i].upvotes
    })
  }
  res.send(results)
})

app.post('/upvote/:id', (req, res) => {
  const id = req.params.id
  for(let i = 0; i < posts.length; i++){
    if(posts[i].id == id){
      posts[i].upvotes++
      res.send(posts[i])
    }
  }
  res.send("Post not found")
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



app.post('/upload', upload.single('file'), async (req, res) => {
  console.log(req.body)

  const address = req.body.address
  const name = req.body.name
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
  let data = await s3.upload(params).promise();
  console.log(`File uploaded successfully. ${data.Location}`);

  const newPost = {
    id: idCounter++,
    address: address,
    video: {
      location: data.Location,
      name: name
    },
    upvotes: 1,
  }
  posts.push(newPost)

  res.send(newPost);
});

app.listen(process.env.PORT, () => {
  console.log(`Server running at http://localhost:${process.env.PORT}`);
});
