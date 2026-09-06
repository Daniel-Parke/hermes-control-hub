---
title: Characters
summary: "Reusable characters, saved once and dropped into any story"
section: guides
nav: 200
audience: operator
screen: /recroom/story-weaver/characters
type: guide
tags: [product, rec-room]
---

# Characters

A shelf of character sheets you write once and drop into any story you start
afterwards.

## What you see

The header reads **Characters**, with a count of the characters you have saved
beneath it, a back link reading STORY WEAVER on the left, and a **New character**
button on the right.

Before you have saved anything, the page holds a short empty state: **No
characters yet**, the line "Create character sheets to reuse across stories",
and a **Create your first character** button that does the same thing as the one
in the header.

Once you have some, they are listed one to a row, in alphabetical order by name.
Each row carries the name, a coloured label for the character's role, and the
description underneath. A character with no description shows the beginning of
its backstory instead, or the words "No description" if you left both blank. Any
tags you gave it sit below that. On the right of the row are two small icons: a
pencil that opens the character for editing, and a bin that deletes it.

Clicking anywhere else on the row expands it, and everything you filled in is
shown in full: **Appearance**, **Backstory**, **Speech patterns**,
**Relationships** and **Personality**. Fields you left empty are not shown at
all, so a thin sheet expands to very little. Clicking again collapses it.

**New character** and the pencil open the same editor, a panel over the page
titled **New character** or **Edit character**. It holds:

- **Name**, and **Role**, a menu of protagonist, ally, antagonist, supporting,
  mystery, mentor, trickster and guardian. New characters start as supporting.
- **Description**, a line or two on who they are.
- **Appearance**, **Backstory**, **Speech patterns** and **Relationships**, each
  a free text box with a hint in it for what belongs there.
- **Personality traits**, where you type a trait and press Enter or the plus
  button to add it. Each becomes a chip with a small cross for removing it.
- **Tags (genre associations)**, which works the same way and is for your own
  grouping.

At the foot of the panel are **Cancel** and **Save character**. Save stays
disabled until the name has something in it; every other field can be left
empty. If a save fails, a red message appears at the top of the panel and the
panel stays open with your text still in it.

If the list itself cannot be read, a red banner appears with a **Retry** button
and the list is not drawn. The empty state is not shown in that case, so a
failed read never looks like an empty shelf.

## Typical use

**Write a character you will use again**

1. Click **New character**.
2. Fill in the name, pick a role, and write as much or as little as you want.
   The parts a model can actually use are the description, the backstory and the
   speech patterns.
3. Add personality traits one at a time, pressing Enter after each.
4. Click **Save character**. The panel closes and the character appears in the
   list, in its alphabetical place.

**Put one into a story**

1. Go to [Create](./story-create.md).
2. In the **Characters** section, click **From Library**. That button only
   appears once you have at least one saved character.
3. Pick one from the **Import character** list. It is copied into the story you
   are setting up, where you can change it freely without touching the saved
   sheet.
4. A character already in the story is greyed out in the picker, matched on
   name, so you cannot add the same one twice.

**Change or remove one**

1. Click the pencil on its row, edit, then **Save character**.
2. To remove it, click the bin. The button changes to read **Delete?**. Click it
   again to confirm. Leave it alone for a few seconds and it disarms itself, so
   a stray first click does nothing.
3. The row disappears. There is no undo in the interface.

## Notes

- **A character here is a template, not a link.** Importing one into a story
  copies its text into that story. Editing the sheet afterwards, or deleting it
  outright, changes nothing about stories that were already created from it.
- **Only the name is required.** A sheet with a name and nothing else saves
  fine, and is not much use to a model. Description, backstory and speech
  patterns are what actually shape how the character reads.
- **The list has no search or filter.** It is alphabetical by name and shows
  everything at once, which is why tags are worth using once the shelf gets
  long.
- **Nothing on this screen costs anything.** No model is called here. The cost
  starts when a story is written, which is covered in
  [Story Weaver](./story-weaver.md).
- **Saving from the create screen always makes a new sheet.** The **Save to
  Library** button on a character card there creates a fresh character rather
  than updating one you imported, and it needs both a name and a description
  before it will do anything. Clicking it twice on the same character leaves you
  with two identical sheets to tidy up here.
- **If a delete fails, the banner replaces the list.** Your characters are still
  there. Click **Retry** to read them again.
- **They are local, and they are backed up.** Characters live in the same
  database file as the rest of your data on this machine and are included in a
  [backup](../running/backup.md).
- **Themes are the other half of this.** A character is a person you reuse; a
  [theme](./story-themes.md) is a premise and its tags. A story can start from
  both.

<details>
<summary>Under the hood</summary>

Every action on this screen is a POST to `/api/stories` with `action:
"characters"` and a `subAction` of `list`, `create`, `update` or `delete`. The
page lists on load, and after a save. A missing name is refused by the server as
well as by the disabled button.

Characters are rows in the `story_characters` table in the SQLite database,
added by migration `029_recroom_library.sql` along with `story_themes`. The
personality traits and tags are stored as JSON arrays of strings, the same
convention the `stories` table uses. Deleting sets `deleted_at` rather than
removing the row, so the text is still in the database file until you replace
it, and a backup taken afterwards still contains it.

The list is ordered by `name COLLATE NOCASE`, which is why casing does not
affect where a character lands in the list.

</details>
