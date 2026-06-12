export const success = (data = null, message = "") => ({
  data,
  error: false,
  message,
});

export const error = (message = "error", data = null) => ({
  data,
  error: true,
  message,
});
