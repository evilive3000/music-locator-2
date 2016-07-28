module.exports = {
  db: {
    read: {
      host: "78.47.240.82",
      port: "27017",
      name: "tidido",
      options: "readPreference=secondary"
    },
    write: {
      host: "192.168.0.184",
      port: "27017",
      // name: "musiclocator"
      name: "vk10"
    }
  },
  mse: 4.0,
  limit: 7
};
