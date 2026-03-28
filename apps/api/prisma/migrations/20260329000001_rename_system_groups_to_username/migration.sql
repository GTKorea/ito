-- Rename existing "My Tasks" system groups to the user's actual name
UPDATE "TaskGroup" tg
SET name = u.name
FROM "User" u
WHERE tg."createdById" = u.id AND tg."isSystem" = true;
