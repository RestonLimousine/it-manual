document.head.innerHTML += '<meta name="viewport" content="width=device-width, initial-scale=1">';
var doc = [
  ["section", {title: "RLS Employee IT Manual"},
    ["p",
      "Welcome to Reston Limousine! This guide is provided by the IT Department " +
      "to help new employees navigate the various IT systems we use, and also to " +
      "provide a reference for employees to use throughout their time at Reston Limousine."],
    ["p",
      "If you are reading a printed or PDF version of this manual, it might be out of " +
      "date. You can always find the current version of this manual at",
      ["linkto" "https://restonlimo.com/internal/employee-it-manual"]]
  ],
  ["section", {title: "IT Department Contact Info"},
    ["p",
      "If you have any questions about the content of this manual or anything else " +
      "related to IT systems, please reach out to the IT department:"],
    ["ul",
      ["li", ["b", "Department Email: "], ["mailto", "it@restonlimo.com"]],
      ["li", ["b", "Manager: "], "Bonnie Custer",
      ["ul",
        ["li", ["b", "Email: "], ["mailto", "bcuster@restonlimo.com"]],
        ["li", ["b", "Extension: "], "538"]]]],
  ["section", {title: "First Steps"},
    ["p",
      "If you have just been hired, here is what to expect in your first few days:"],
    ["ol",
      ["li",
        ["b", "PC & Workstation: "],
        "Your manager will show you to the area where you will work."],
      ["li",
        ["b", "Network Credentials: "],
        "IT will create a network account for you, and your manager will provide " +
        "you the credentials you will use to log into your PC the first time."],
      ["li",
        ["b", "Phone Extension: "],
        "If your workstation includes a desk phone, IT will register your extension."]],
    ["p",
      "Here is what you need to do after the above:"],
    ["ol",
      ["li",
        ["b", "Log Into PC: "],
        "Use your new network credentials to log into your PC. Open up Outlook -- " +
        "the first time, you may need to enter your network credentials again, but " +
       "you can choose to save them so you don't have to enter them in the future."]]]
];

function createElement(el) {
  if (typeof el === "string") el = ["span" el];
  var tag = el[0],
      contents = el.slice(1),
      realTag = tag,
      attrs = {};
  if (typeof contents[0] === "object") {
    attrs = contents[0];
    contents = contents.slice(1);
  }
  switch (tag) {
    case "mailto": case "linkto": realTag = "a"; break;
    case "section": realTag = "div"; break;
  }
  el = document.createElement(realTag);
  for (var prop in attrs) {
    el.setAttribute(prop, attrs[prop]);
  }
  switch (tag) {
    case "mailto":
      el.href = "mailto:" + contents[0];
      el.innerText = contents[0];
      contents = [];
    break;
    case "linkto":
      el.href = el.innerText = contents[0];
      contents = [];
    break;
    case "section":
      var h1 = document.createElement("h1"),
          title = el.getAttribute("title"),
          a = document.createElement("a");
      el.id = title.toLowerCase().replace(/ /g, "-");
      el.className = "section";
      a.textContent = title;
      a.href = "#" + el.id;
      h1.appendChild(a);
      contents.unshift(h1);
    break;
  }
  contents = buildDoc(contents);
  for (var i = 0; i < contents.length; i++) {
    el.appendChild(contents[i]);
  }
  return el;
}

function buildDoc (els) {
  var accum = [];
  for (var i = 0; i < els.length; i++) {
    accum = accum.concat([createElement(els[i])]);
  }
  return accum;
}

document.body.innerHTML = "";
var page = document.createElement("div");
page.className = "page";
var pageNo = document.createElement("div");
pageNo.className = "page-number";
var pageLink = document.createElement("a");
pageLink.href = "#page-1";
pageLink.id = "page-1";
pageLink.innerText = "1";
pageNo.appendChild(pageLink);
page.appendChild(pageNo);
var firstPage = page.cloneNode(true);
document.body.appendChild(firstPage);
var sections = buildDoc(doc);
for (var i = 0; i < sections.length; i++) {
  firstPage.appendChild(sections[i]);
}
var height = 0,
    pageNo = 1,
    pageHeight = 9 * 96,
    currPage = firstPage;
sections = document.getElementsByClassName("section");
sections = [].slice.call(sections);
for (var i = 0; i < sections.length; i++) {
  var section = sections[i],
      pageRemaining = pageHeight - height,
      elHeight = section.clientHeight;
  if (elHeight > pageRemaining) {
    height = 0;
    pageNo++;
    var beforeBreak = section.cloneNode(true),
        newPage = page.cloneNode(true),
        pageLink = newPage.querySelector(".page-number a");
    pageLink.innerText = pageNo;
    pageLink.href = "#page-" + pageNo;
    pageLink.id = "page-" + pageNo;
    if (pageRemaining >= 65) {
      // var children = [].slice.call(section.childNodes);
      // for (var j = 0; j < children.length; j++) {
      //   
      // }
      var cutOff = Math.floor((pageRemaining - 49) / 32) * 32 + 49;
      beforeBreak.style.height = cutOff;
      currPage.appendChild(beforeBreak);
      section.style.height = elHeight - cutOff;
      section.style.display = "flex";
      section.style.flexDirection = "column";
      section.style.justifyContent = "flex-end";
    }
    currPage = newPage;
    document.body.appendChild(currPage);
  } else {
    height += elHeight;
  }
  if (pageNo > 1) currPage.appendChild(section);
}
