import pg from 'pg';

const database = new pg.Client({
    user:'postgres',
    host:'localhost',
    password:'1234',
    database:'blood_donation',
    port: 5432
})

database.connect((error) =>{
    if(error){
        console.error("connection failed! ", error.stack);
    }
    console.log("connection successful!..");

})


export default database;