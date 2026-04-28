import { ZodError } from "zod";

export const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
  return res.status(422).json({
    success: false,
    message: "Validation failed",
    errors: err.issues?.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    })) || [],
  });
}

  // PostgreSQL unique violation
  if (err.code === "23505") {
    return res.status(409).json({ success: false, message: "Resource already exists" });
  }

  // PostgreSQL foreign key violation
  if (err.code === "23503") {
    return res.status(400).json({ success: false, message: "Invalid reference" });
  }

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : "Internal server error";

  if (status >= 500) {
    req.log?.error(err);
  }

  res.status(status).json({ success: false, message });
};
