---
id: les_html_03
title: Forms & Semantic HTML
type: theory
estimatedMinutes: 45
order: 3
---

# Forms & Semantic HTML

Learn how to create forms and use semantic HTML elements to structure your web pages properly.

---

## HTML Forms

An HTML form is used to collect user input. The user input is most often sent to a server for processing.

### The `<form>` Element

The HTML `<form>` element is used to create an HTML form for user input:

```html
<form>form elements</form>
```

The `<form>` element is a container for different types of input elements, such as: text fields, checkboxes, radio buttons, submit buttons, etc.

---

## The `<input>` Element

The HTML `<input>` element is the most used form element.

An `<input>` element can be displayed in many ways, depending on the `type` attribute.

Here are some examples:

| Type                      | Description                                                 |
| ------------------------- | ----------------------------------------------------------- |
| `<input type="text">`     | Displays a single-line text input field                     |
| `<input type="radio">`    | Displays a radio button (for selecting one of many choices) |
| `<input type="checkbox">` | Displays a checkbox (for selecting zero or more choices)    |
| `<input type="submit">`   | Displays a submit button (for submitting the form)          |
| `<input type="button">`   | Displays a clickable button                                 |

---

## Text Input Fields

`<input type="text">` defines a single-line input field for text input.

### Example

```html
<form>
  <label for="fname">First name:</label><br />
  <input type="text" id="fname" name="fname" /><br />
  <label for="lname">Last name:</label><br />
  <input type="text" id="lname" name="lname" />
</form>
```

**[Try it Yourself »](/playground?language=html&code=%3Cform%3E%0D%0A++%3Clabel+for%3D%22fname%22%3EFirst+name%3A%3C%2Flabel%3E%3Cbr+%2F%3E%0D%0A++%3Cinput+type%3D%22text%22+id%3D%22fname%22+name%3D%22fname%22+%2F%3E%3Cbr+%2F%3E%0D%0A++%3Clabel+for%3D%22lname%22%3ELast+name%3A%3C%2Flabel%3E%3Cbr+%2F%3E%0D%0A++%3Cinput+type%3D%22text%22+id%3D%22lname%22+name%3D%22lname%22+%2F%3E%0D%0A%3C%2Fform%3E)**

This is how the HTML code above will be displayed in a browser:

First name:  
[ text input ]

Last name:  
[ text input ]

---

## The `<label>` Element

The `<label>` tag defines a label for many form elements.

The `<label>` element is useful for screen-reader users, because the screen-reader will read out loud the label when the user focus on the input element.

The `<label>` element also helps users who have difficulty clicking on very small regions - because when the user clicks the text within the `<label>` element, it toggles the input.

The `for` attribute of the `<label>` tag should be equal to the `id` attribute of the `<input>` element to bind them together.

---

## Radio Buttons

`<input type="radio">` defines a radio button.

Radio buttons let a user select ONE of a limited number of choices.

### Example

```html
<form>
  <p>Please select your favorite Web language:</p>
  <input type="radio" id="html" name="fav_language" value="HTML" />
  <label for="html">HTML</label><br />
  <input type="radio" id="css" name="fav_language" value="CSS" />
  <label for="css">CSS</label><br />
  <input type="radio" id="javascript" name="fav_language" value="JavaScript" />
  <label for="javascript">JavaScript</label>
</form>
```

**[Try it Yourself »](/playground?language=html&code=%3Cform%3E%0D%0A++%3Cp%3EPlease+select+your+favorite+Web+language%3A%3C%2Fp%3E%0D%0A++%3Cinput+type%3D%22radio%22+id%3D%22html%22+name%3D%22fav_language%22+value%3D%22HTML%22+%2F%3E%0D%0A++%3Clabel+for%3D%22html%22%3EHTML%3C%2Flabel%3E%3Cbr+%2F%3E%0D%0A++%3Cinput+type%3D%22radio%22+id%3D%22css%22+name%3D%22fav_language%22+value%3D%22CSS%22+%2F%3E%0D%0A++%3Clabel+for%3D%22css%22%3ECSS%3C%2Flabel%3E%3Cbr+%2F%3E%0D%0A++%3Cinput+type%3D%22radio%22+id%3D%22javascript%22+name%3D%22fav_language%22+value%3D%22JavaScript%22+%2F%3E%0D%0A++%3Clabel+for%3D%22javascript%22%3EJavaScript%3C%2Flabel%3E%0D%0A%3C%2Fform%3E)**

---

## Checkboxes

`<input type="checkbox">` defines a checkbox.

Checkboxes let a user select ZERO or MORE options of a limited number of choices.

### Example

```html
<form>
  <input type="checkbox" id="vehicle1" name="vehicle1" value="Bike" />
  <label for="vehicle1">I have a bike</label><br />
  <input type="checkbox" id="vehicle2" name="vehicle2" value="Car" />
  <label for="vehicle2">I have a car</label><br />
  <input type="checkbox" id="vehicle3" name="vehicle3" value="Boat" />
  <label for="vehicle3">I have a boat</label>
</form>
```

**[Try it Yourself »](/playground?language=html&code=%3Cform%3E%0D%0A++%3Cinput+type%3D%22checkbox%22+id%3D%22vehicle1%22+name%3D%22vehicle1%22+value%3D%22Bike%22+%2F%3E%0D%0A++%3Clabel+for%3D%22vehicle1%22%3EI+have+a+bike%3C%2Flabel%3E%3Cbr+%2F%3E%0D%0A++%3Cinput+type%3D%22checkbox%22+id%3D%22vehicle2%22+name%3D%22vehicle2%22+value%3D%22Car%22+%2F%3E%0D%0A++%3Clabel+for%3D%22vehicle2%22%3EI+have+a+car%3C%2Flabel%3E%3Cbr+%2F%3E%0D%0A++%3Cinput+type%3D%22checkbox%22+id%3D%22vehicle3%22+name%3D%22vehicle3%22+value%3D%22Boat%22+%2F%3E%0D%0A++%3Clabel+for%3D%22vehicle3%22%3EI+have+a+boat%3C%2Flabel%3E%0D%0A%3C%2Fform%3E)**

---

## The Submit Button

`<input type="submit">` defines a button for submitting the form data to a form-handler.

The form-handler is typically a file on the server with a script for processing input data.

### Example

```html
<form action="/action_page.php">
  <label for="fname">First name:</label><br />
  <input type="text" id="fname" name="fname" value="John" /><br />
  <label for="lname">Last name:</label><br />
  <input type="text" id="lname" name="lname" value="Doe" /><br /><br />
  <input type="submit" value="Submit" />
</form>
```

**[Try it Yourself »](/playground?language=html&code=%3Cform+action%3D%22%2Faction_page.php%22%3E%0D%0A++%3Clabel+for%3D%22fname%22%3EFirst+name%3A%3C%2Flabel%3E%3Cbr+%2F%3E%0D%0A++%3Cinput+type%3D%22text%22+id%3D%22fname%22+name%3D%22fname%22+value%3D%22John%22+%2F%3E%3Cbr+%2F%3E%0D%0A++%3Clabel+for%3D%22lname%22%3ELast+name%3A%3C%2Flabel%3E%3Cbr+%2F%3E%0D%0A++%3Cinput+type%3D%22text%22+id%3D%22lname%22+name%3D%22lname%22+value%3D%22Doe%22+%2F%3E%3Cbr+%2F%3E%3Cbr+%2F%3E%0D%0A++%3Cinput+type%3D%22submit%22+value%3D%22Submit%22+%2F%3E%0D%0A%3C%2Fform%3E)**

---

## Semantic HTML Elements

Semantic HTML elements clearly describe their meaning in a human- and machine-readable way.

Elements such as `<header>`, `<footer>`, and `<article>` are all considered semantic because they accurately describe the purpose of the element and the type of content inside.

### Why Use Semantic Elements?

According to the W3C: "A semantic Web allows data to be shared and reused across applications, enterprises, and communities."

### Common Semantic Elements

Here are some commonly used semantic HTML elements:

- `<header>` - Defines a header for a document or section
- `<nav>` - Defines navigation links
- `<main>` - Specifies the main content of a document
- `<article>` - Defines independent, self-contained content
- `<section>` - Defines a section in a document
- `<aside>` - Defines content aside from the page content
- `<footer>` - Defines a footer for a document or section
- `<figure>` - Specifies self-contained content, like illustrations, diagrams, photos, code listings, etc.
- `<figcaption>` - Defines a caption for a `<figure>` element

---

## Example: Semantic HTML Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Website</title>
  </head>
  <body>
    <header>
      <h1>Welcome to My Website</h1>
      <nav>
        <a href="#home">Home</a> | <a href="#about">About</a> |
        <a href="#contact">Contact</a>
      </nav>
    </header>

    <main>
      <article>
        <h2>Article Title</h2>
        <p>This is the main content of the article.</p>
      </article>

      <aside>
        <h3>Related Links</h3>
        <ul>
          <li><a href="#">Link 1</a></li>
          <li><a href="#">Link 2</a></li>
        </ul>
      </aside>
    </main>

    <footer>
      <p>&copy; 2025 My Website. All rights reserved.</p>
    </footer>
  </body>
</html>
```

**[Try it Yourself »](/playground?language=html&code=%3C%21DOCTYPE+html%3E%0D%0A%3Chtml%3E%0D%0A++%3Chead%3E%0D%0A++++%3Ctitle%3EMy+Website%3C%2Ftitle%3E%0D%0A++%3C%2Fhead%3E%0D%0A++%3Cbody%3E%0D%0A++++%3Cheader%3E%0D%0A++++++%3Ch1%3EWelcome+to+My+Website%3C%2Fh1%3E%0D%0A++++++%3Cnav%3E%0D%0A++++++++%3Ca+href%3D%22%23home%22%3EHome%3C%2Fa%3E+%7C+%3Ca+href%3D%22%23about%22%3EAbout%3C%2Fa%3E+%7C%0D%0A++++++++%3Ca+href%3D%22%23contact%22%3EContact%3C%2Fa%3E%0D%0A++++++%3C%2Fnav%3E%0D%0A++++%3C%2Fheader%3E%0D%0A%0D%0A++++%3Cmain%3E%0D%0A++++++%3Carticle%3E%0D%0A++++++++%3Ch2%3EArticle+Title%3C%2Fh2%3E%0D%0A++++++++%3Cp%3EThis+is+the+main+content+of+the+article.%3C%2Fp%3E%0D%0A++++++%3C%2Farticle%3E%0D%0A%0D%0A++++++%3Caside%3E%0D%0A++++++++%3Ch3%3ERelated+Links%3C%2Fh3%3E%0D%0A++++++++%3Cul%3E%0D%0A++++++++++%3Cli%3E%3Ca+href%3D%22%23%22%3ELink+1%3C%2Fa%3E%3C%2Fli%3E%0D%0A++++++++++%3Cli%3E%3Ca+href%3D%22%23%22%3ELink+2%3C%2Fa%3E%3C%2Fli%3E%0D%0A++++++++%3C%2Ful%3E%0D%0A++++++%3C%2Faside%3E%0D%0A++++%3C%2Fmain%3E%0D%0A%0D%0A++++%3Cfooter%3E%0D%0A++++++%3Cp%3E%26copy%3B+2025+My+Website.+All+rights+reserved.%3C%2Fp%3E%0D%0A++++%3C%2Ffooter%3E%0D%0A++%3C%2Fbody%3E%0D%0A%3C%2Fhtml%3E)**

---

## Benefits of Semantic HTML

1. **Accessibility**: Screen readers and browsers can better understand the content
2. **SEO**: Search engines can better index your content
3. **Maintainability**: Code is easier to read and maintain
4. **Consistency**: Provides a standard way to structure documents

---

## Summary

- HTML forms are used to collect user input
- The `<input>` element has many types: text, radio, checkbox, submit, etc.
- Always use `<label>` elements with form inputs for accessibility
- Semantic HTML elements describe their content and purpose
- Using semantic elements improves accessibility, SEO, and code maintainability

---
