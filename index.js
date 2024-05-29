const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname == "featureImage") {
      cb(null, "public/photos");
    }
    if (file.fieldname == "galleryImage") {
      cb(null, "public/gallery");
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// middlewares
app.use(
  cors({
    origin: ["https://lucent-stroopwafel-9e2be6.netlify.app/"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static("public"));

// multer middlewares
const formDataUpload = multer({
  storage,
}).fields([
  {
    name: "featureImage",
    maxCount: 1,
  },
  {
    name: "galleryImage",
    maxCount: 1,
  },
]);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nbvx4ye.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7) await
    client.connect();

    // collections
    const addUser = client.db("usersDb").collection("user");
    const addProduct = client.db("productsDb").collection("product");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists:
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email };
      const existingUser = await addUser.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await addUser.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const cursor = addUser.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // create products
    app.post("/dashboard/product", formDataUpload, async (req, res) => {
      const { title, description, category, productCode, price, salePrice } =
        req.body;
      const { featureImage, galleryImage } = req.files;
      const photo = featureImage[0].path;
      const gallery = galleryImage[0].path;
      console.log(req.files);
      // console.log(newProduct);
      const product = {
        title,
        description,
        category,
        productCode,
        price,
        salePrice,
        photo,
        gallery,
      };
      const result = await addProduct.insertOne(product);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("The E-commerce server is running");
});

app.listen(port, () => {
  console.log(`The Port is : ${port}`);
});
