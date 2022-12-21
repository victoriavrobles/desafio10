import express from 'express'
import faker from 'faker'
faker.locale = 'es';

import { Server as HttpServer } from 'http'
import { Server as Socket } from 'socket.io'

import ContenedorMemoria from './contenedores/ContenedorMemoria.js'

import { normalize, schema } from 'normalizr';

const app = express()
const httpServer = new HttpServer(app)
const io = new Socket(httpServer)

const productosApi = new ContenedorMemoria()
const mensajesApi = new ContenedorMemoria()


io.on('connection', async socket => {
    console.log('Nuevo cliente conectado!');

    // carga inicial de productos
    socket.emit('productos', await productosApi.listarAll());

    // actualizacion de productos
    socket.on('update', async producto => {
        await productosApi.guardar(producto)
        io.sockets.emit('productos', await productosApi.listarAll());
    })

    // carga inicial de mensajes
    socket.emit('mensajes', await obtenerMensajesNormalizados());

    // actualizacion de mensajes
    socket.on('nuevoMensaje', async mensaje => {
        mensaje.fyh = new Date().toLocaleString()
        await mensajesApi.guardar(mensaje)
        io.sockets.emit('mensajes', await obtenerMensajesNormalizados());
    })
});


const autorSchema = new schema.Entity('autor', {}, { idAttribute: 'email' });

const mensajeSchema = new schema.Entity('post', {
    autor: autorSchema
}, { idAttribute: 'id' });

const mensajesSchema = new schema.Entity('posts', {
    mensajes: [mensajeSchema]
}, { idAttribute: 'id' });


const obtenerMensajesNormalizados = async () => {
    const arregloMensajes = await mensajesApi.listarAll();
    return normalize({
        id: 'mensajes',
        mensajes: arregloMensajes,
    }, mensajesSchema);
};


app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))


app.get('/api/productos-test', (req, res) => {
    const productosAleatorios = [];
    for (let index = 0; index < 5; index++) {
        productosAleatorios.push({
            id: index + 1,
            title: faker.commerce.product(),
            price: faker.commerce.price(),
            thumbnail: faker.image.imageUrl()
        });
    }
    res.json(productosAleatorios);
});


const PORT = 8080
const connectedServer = httpServer.listen(PORT, () => {
    console.log(`Servidor http escuchando en el puerto ${connectedServer.address().port}`)
})
connectedServer.on('error', error => console.log(`Error en servidor ${error}`))
