#!/usr/bin/env node

import * as debug from "debug";
import * as grpc from "grpc";

import { BookServiceService } from "./proto/book_grpc_pb";
import { Book, GetBookRequest, GetBookViaAuthor } from "./proto/book_pb";

const log = debug("SampleServer");

function startServer() {

  const server = new grpc.Server();

  server.addService(BookServiceService, {
    getBook: (call: grpc.ServerUnaryCall, callback: grpc.sendUnaryData) => {
      const book = new Book();

      book.setTitle("DefaultBook");
      book.setAuthor("DefaultAuthor");

      log(`[getBook] Done: ${JSON.stringify(book.toObject())}`);
      callback(null, book);
    },
    getBooks: (call: grpc.ServerDuplexStream) => {
      call.on("data", (request: GetBookRequest) => {
        const reply = new Book();
        reply.setTitle(`Book${request.getIsbn()}`);
        reply.setAuthor(`Author${request.getIsbn()}`);
        reply.setIsbn(request.getIsbn());
        log(`[getBooks] Write: ${JSON.stringify(reply.toObject())}`);
        call.write(reply);
      });
      call.on("end", () => {
        log("[getBooks] Done.");
        call.end();
      });
    },
    getBooksViaAuthor: (call: grpc.ServerWriteableStream) => {
      const request = call.request as GetBookViaAuthor;

      log(`[getBooksViaAuthor] Request: ${JSON.stringify(request.toObject())}`);
      for (let i = 1; i <= 10; i++) {
        const reply = new Book();
        reply.setTitle(`Book${i}`);
        reply.setAuthor(request.getAuthor());
        reply.setIsbn(i);
        log(`[getBooksViaAuthor] Write: ${JSON.stringify(reply.toObject())}`);
        call.write(reply);
      }
      log("[getBooksViaAuthor] Done.");
      call.end();
    },
    getGreatestBook: (call: grpc.ServerReadableStream, callback: grpc.sendUnaryData) => {
      let lastOne: GetBookRequest;
      call.on("data", (request: GetBookRequest) => {
        log(`[getGreatestBook] Request: ${JSON.stringify(request.toObject())}`);
        lastOne = request;
      });
      call.on("end", () => {
        const reply = new Book();
        reply.setIsbn(lastOne.getIsbn());
        reply.setTitle("LastOne");
        reply.setAuthor("LastOne");
        log(`[getGreatestBook] Done: ${JSON.stringify(reply.toObject())}`);
        callback(null, reply);
      });
    },
  });

  server.bind("127.0.0.1:50051", grpc.ServerCredentials.createInsecure());
  server.start();

  log("Server started, listening: 127.0.0.1:50051");
}

startServer();

process.on("uncaughtException", (err) => {
  log(`process on uncaughtException error: ${err}`);
});

process.on("unhandledRejection", (err) => {
  log(`process on unhandledRejection error: ${err}`);
});
