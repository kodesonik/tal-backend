import cron from 'node-cron';
import { Client, Databases, Users } from 'node-appwrite';
import axios from 'axios';
import imageModel from './schemas/image.schema';

export const syncJob = () => {
  cron.schedule('* * * * *', async () => {
    await syncAgency()
  });
}
const MASTER_IMAGE_HOST = 'http://141.148.237.51:' + process.env.PORT + '/'
const collections = [
  "admin",
  "country",
  "town",
  "agency",
  "employee",
  "partner",
  "store",
  "customer",
  "vehicleType",
  "vehicle",
  "package",
  "payment",
  "entrance",
  "delivery",
  "exit",
  "file",
  "contact"
];

const syncAgency = async () => {
  try {
    const client = new Client()
      .setEndpoint(process.env.ENDPOINT || '') // Your Appwrite Endpoint
      .setProject(process.env.PROJECT_ID || '')                // Your project ID
      .setKey(process.env.PROJECT_KEY || '') // Your; 

    const clientDatabases = new Databases(client);
    const clientDatabaseId = process.env.DB || "test";
    const clientUsers = new Users(client)

    const master = new Client()
      .setEndpoint(process.env.MASTER_ENDPOINT || '') // Your Appwrite Endpoint
      .setProject(process.env.MASTER_PROJECT_ID || '')                // Your project ID
      .setKey(process.env.MASTER_PROJECT_KEY || '') // Your; 

    const masterDatabases = new Databases(master);
    const masterDatabaseId = process.env.MASTER_DB || "test";
    const masterUsers = new Users(master);

    //SYnc users
    const remoteUsers = await masterUsers.list();
    const localUsers = await clientUsers.list();
    const promises: any[] = [];
    if (!remoteUsers.total && !localUsers.total) {
    } else if (remoteUsers.total && !localUsers.total) {
      remoteUsers.users.map(async (user) => {
        const { $id, ...data } = user;
        return await promises.push(
          clientUsers.create(
            $id,
            data.email,
            data.phone || null,
            "password",
            data.name
          )
        );
      });
      await Promise.all(promises);
    } else if (!remoteUsers.total && localUsers.total) {
      localUsers.users.map(async (user) => {
        const { $id, ...data } = user;
        return await promises.push(
          masterUsers.create(
            $id,
            data.email,
            data.phone || null,
            "password",
            data.name
          )
        );
      });
      await Promise.all(promises);
    } else if (remoteUsers.total && localUsers.total) {
      await remoteUsers.users.map(async (user) => {
        const { $id, ...data } = user;
        const localUser = await localUsers.users.find(
          (user) => user["$id"] === $id
        );
        if (!localUser) {
          return await promises.push(
            clientUsers.create(
              $id,
              data.email,
              data.phone || null,
              "password",
              data.name
            )
          );
        }
      });
      await localUsers.users.map(async (user) => {
        const { $id, ...data } = user;
        const remoteUser = await remoteUsers.users.find(
          (user) => user["$id"] === $id
        );
        if (!remoteUser) {
          return await promises.push(
            masterUsers.create(
              $id,
              data.email,
              data.phone || null,
              "password",
              data.name
            )
          );
        }
      });
    }

    // Data Sync

    const syncData = async (collection: string) => {
      const syncedFiles = collection === 'file'
      const localData = await clientDatabases.listDocuments(
        clientDatabaseId,
        collection
      );
      const remoteData = await masterDatabases.listDocuments(
        masterDatabaseId,
        collection
      );

      await localData.documents.forEach(async (lItem: any) => {

        const rItem: any = remoteData.documents.find(
          (rItem) => rItem["$id"] === lItem["$id"]
        );

        // delete subdocuments
        delete lItem.contacts
       if (rItem) delete rItem.contacts

        if (rItem && rItem["syncedAt"] < lItem["syncedAt"]) {
          console.log(collection, "elder on remote");
          const { $id, $permissions, $collectionId, $databaseId, ...data } =
            lItem;
          await masterDatabases.updateDocument(
            masterDatabaseId,
            collection,
            $id,
            data
          );
        } else if (rItem && rItem["syncedAt"] > lItem["syncedAt"]) {
          console.log(collection, "Newer on remote");
          const { $id, $permissions, $collectionId, $databaseId, ...data } =
            rItem;
          await clientDatabases.updateDocument(
            clientDatabaseId,
            collection,
            $id,
            data
          );
        } else if (rItem && rItem["syncedAt"] == lItem["syncedAt"]) {
          console.log(collection, "Alreadry synced");
        } else {
          console.log(collection, "Don't exist on remote");
          const { $id, $permissions, $collectionId, $databaseId, ...data } =
            lItem;
          // console.log(data);
          await masterDatabases.createDocument(
            masterDatabaseId,
            collection,
            $id,
            data
          );
          if (syncedFiles) {
            console.log('sending images...', data.value);
            await sendImage(data.value)
          }
        }
      });

      return await remoteData.documents
        .filter(
          (rItem) =>
            !localData.documents.find((lItem) => lItem["$id"] === rItem["$id"])
        )
        .forEach(async (rItem) => {
          console.log(collection, "Add new element from remote", rItem["$id"]);
          const { $id, $permissions, $collectionId, $databaseId, ...data } =
            rItem as any;
          await clientDatabases.createDocument(
            clientDatabaseId,
            collection,
            $id,
            data
          );
          if (syncedFiles) {
            console.log('receiveing images...', data.value);
            await receiveImage(data.value)
          }
        });
    };
    const dataPromises = collections.map(async (collection) =>
      syncData(collection)
    );

    await Promise.all(dataPromises);

  } catch (err) {
    console.log('SYnc failed this time for: ' + err.message)
  }
}

const sendImage = async (id: string) => {
  const image = await imageModel.findById(id)
  // console.log('image', image)
  if (!image) {
    return console.log('failed to find image')
  }
  return await $post('save-image', image)
}

const receiveImage = async (id: string) => {
  const image = await $get('copy-image', id)
  console.log('image', image)
  
  if (!image) {
    return console.log('failed to retrieve image')
  }
  return await imageModel.create(image)
}

const $post = async (path: string, image: any) => {
  const headers = {
    'Content-Type': 'application/json',
    // 'Authorization': 'Bearer ' +  await TokenManager.generate({ id: 0, role: 'super'})
  }
  // console.log(url)
  try {
    const { data } = await axios.post(MASTER_IMAGE_HOST + path, image, { headers })
    return data
  } catch (err) {
    console.log('error', err.message)
  }
}


const $get = async (path: string, id: string) => {
  const headers = {
    'Content-Type': 'application/json',

    // 'Authorization': 'Bearer ' + await TokenManager.generate({ id: 0, role: 'super'})
  }
  // console.log(url)
  try {
    const res = await axios.get(MASTER_IMAGE_HOST + path, { headers, data: { id } })
    console.log('recieved res', res)
    console.log('recieved data', res.data)
    return res.data
  } catch (err) {
    console.log('failed for', err.message)
  }
}
