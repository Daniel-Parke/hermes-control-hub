---
title: Themes
summary: "Reusable premises and tags, saved as a theme you can load later"
section: guides
nav: 210
audience: operator
screen: /recroom/story-weaver/themes
type: guide
tags: [product, rec-room]
---

# Themes

A theme is a story idea you have saved: the premise, plus the genre, era, setting
and mood that go with it, kept so you can start another story from it without
typing it all again.

## What you see

While the list loads, the page is a spinner on an empty screen. Then the header
appears, reading **Themes**, with a back link reading STORY WEAVER on the left
and a count of your saved themes underneath the title. At the top right is a
**New theme** button.

The page itself is a grid of cards, one per theme, two to a row on a wide window
and one on a narrow one. They are in alphabetical order by name. Each card shows:

- The theme's **name**, and the first few lines of its **premise** below it.
- A row of small tags: every genre you chose, in green, then the era, then the
  first two moods. The setting and the notes are not shown on the card.
- Three controls at the bottom right: **Use**, a pencil icon for editing, and a
  bin icon for deleting.

Before you have saved anything, the grid is replaced by an empty state reading
**No saved themes yet**, with the line "Save story concepts to build on over
time" and a **Create your first theme** button.

If the themes cannot be read, a red banner appears at the top saying so, with a
**Retry** button. The empty state is not shown in that case, so a failed read
never looks like an empty shelf.

**The editor.** New theme and the pencil icon both open the same panel over the
page, titled **New story theme** or **Edit story theme**, with an X at its top
right. Its fields, top to bottom:

- **Name**, a single line.
- **Premise**, a few lines: what the story is about.
- **Genre**, a fixed set of chips (Sci-Fi, Mystery, Fantasy, Romance, Crime,
  Horror, Adventure, Historical). Click to select, click again to clear. You can
  pick as many as you like.
- **Era**, chips again (Ancient, Medieval, Modern, Near Future, Far Future,
  Timeless), but only one at a time.
- **Mood**, chips (Tense, Wonder, Humorous, Dark, Hopeful, Melancholy,
  Suspenseful, Whimsical), as many as you like.
- **Setting**, a single line you type yourself, prompted with "Where does the
  story take place?".
- **Notes**, a couple of lines for anything else: character ideas, plot points.

At the bottom are **Cancel** and **Save theme**. Save theme stays dim until both
Name and Premise have something in them, and reads "Saving..." while it works.
If the save fails, the reason appears as a small red banner inside the panel and
nothing you have typed is lost. Escape, the X, and a click on the dimmed
background outside the panel all close it without saving.

## Typical use

**Save an idea you want to come back to**

1. Click **New theme**.
2. Give it a name and write the premise. The name is what you will recognise on
   the card, so make it the idea rather than the genre.
3. Pick the genre, era and mood chips that fit, type a setting, and add any
   notes for yourself.
4. Click **Save theme**. The panel closes and the theme appears in the grid, in
   its alphabetical place.

**Start a story from a theme**

1. Click **Use** on the card.
2. You land on [create a story](./story-create.md) with the premise, genre, era,
   setting and mood already filled in, and that theme shown as the selected one
   under Saved themes.
3. Add a title, characters and the shape of the story, then start it. The theme
   is untouched by any of that.

**Change or remove one**

1. Click the pencil icon to reopen the theme in the editor, change what you want
   and click **Save theme**.
2. To remove it, click the bin icon. It changes to read **Delete?**; click again
   to confirm. Leave it alone for a few seconds and it disarms itself, so a
   stray first click does nothing.
3. The card disappears and the count in the header drops. There is no undo in
   the interface.

## Notes

- **A theme is a starting point, not a link.** Using it copies its values into
  the create form. Editing the theme afterwards changes nothing about stories
  already made from it, and deleting it leaves them alone.
- **Nothing here costs anything.** No model is called on this screen. Saving,
  editing and deleting a theme all happen on your machine. The cost arrives when
  a story is written, which is covered on
  [Story Weaver](./story-weaver.md) and in [spend](../concepts/spend.md).
- **Notes are for you.** They are not carried into the create screen and are not
  sent to the model. They are only visible when you reopen the theme here.
- **The chip lists here are fixed.** The create screen lets you add your own
  genre, era and mood tags with its **+ Add** control; this editor offers the
  built-in ones only. A story started from a theme can still have tags added on
  the create screen afterwards.
- **Setting is typed here and chosen from chips there.** A setting you write
  that does not match one of the create screen's suggestions is still applied,
  and still reaches the story. It is not shown as a highlighted chip, which can
  make it look as though it was dropped.
- **There is a second way in.** The create screen has its own **Saved themes**
  block, which lists the same themes, loads one on a click, and has a **Save as
  Theme** button that saves whatever premise and tags you have in front of you.
  It saves everything except the notes.
- **A failed delete hides the list.** The message appears in the same red banner
  at the top and the grid is replaced by it. Press **Retry** and the themes come
  back, including the one that would not delete.
- **The library is one library.** Your themes and your saved
  [characters](./story-characters.md) belong to the install rather than to any
  one story, so every story you start can draw on all of them.
- **They are local.** Themes live in the same database as everything else on
  your machine and are included in a [backup](../running/backup.md).

<details>
<summary>Under the hood</summary>

Every action on this screen is a POST to `/api/stories` with `action: "themes"`
and a `subAction` of `list`, `create`, `update` or `delete`. The page lists on
load and again after a save.

Themes are rows in the `story_themes` table, added by the migration that created
the Rec Room library alongside `story_characters`. Genre and mood are stored as
JSON arrays. Deleting sets `deleted_at` rather than removing the row, so a deleted
theme is gone from the interface but its text is still in the database file, and
a backup taken afterwards still contains it. The list query skips deleted rows
and sorts by name, case-insensitively.

**Use** navigates to `/recroom/story-weaver/create?theme=<id>`. That screen
re-reads the theme list, finds the match and applies its premise, genre, era,
setting and mood to the form; `notes` has no field there and is ignored. The
values are then written into the story's own config when you start it, so the
story keeps a copy rather than a reference to the theme.

The server requires a name and answers "Theme name is required" without one. The
premise is required by this screen's Save button rather than by the server, so
the empty-premise case is prevented in the interface rather than in the data.

</details>
