module.exports = (data) => {
  const errors = [];
  if (!data.title || data.title.trim() === "") errors.push("Title is required");
  if (!data.description || data.description.trim() === "")
    errors.push("Description is required");
  if (!data.category || data.category.trim() === "")
    errors.push("Category is required");
  if (!data.instructor?.name || data.instructor.name.trim() === "")
    errors.push("Instructor name is required");
  return errors;
};
