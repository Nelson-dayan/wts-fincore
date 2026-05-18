const mongoose = require("mongoose");
const uri = "mongodb+srv://seclance1010:seclance1010@cluster0.kgycqj2.mongodb.net/?appName=Cluster0";

async function check() {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB!");

  // Find the latest invoice (with # SLMEC/INV/2026/00006)
  const targetId = "6a0af1521eb39b9060e6cd70";
  
  const res = await mongoose.connection.db.collection("invoices").updateOne(
    { _id: new mongoose.Types.ObjectId(targetId) },
    { 
      $set: { 
        lifecycleStatus: "DRAFT_VISIBLE",
        "extras._hiddenUntilSaved": false 
      } 
    }
  );
  
  console.log("Update result:", res);

  await mongoose.disconnect();
}

check().catch(console.error);
