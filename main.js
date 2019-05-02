document.head.innerHTML += '<meta name="viewport" content="width=device-width, initial-scale=1">';

var doc = [
  ["section", {title: "RLS Employee IT Manual"},
    ["p",
      "Welcome to Reston Limousine! This guide is provided by the IT Department " +
      "to help new employees navigate the various IT systems we use, and also to " +
      "provide a reference for employees to use throughout their time at Reston Limousine."],
    ["p",
      "If you are reading a printed or PDF version of this manual, it might be out of " +
      "date. You can always find the current version of this manual at ",
      ["linkto", "https://restonlimo.com/internal/employee-it-manual"]]
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
          ["li", ["b", "Extension: "], "538"]]]]],
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
  if (typeof el === "string") el = ["span", el];
  
  var tag = el[0],
      contents = el.slice(1),
      realTag = tag,
      attrs = {};
  
  if (contents[0].constructor === Object) {
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
      el.target = "__blank";
      contents = [];
    break;
    case "section":
      var title = el.getAttribute("title"),
          id = title.toLowerCase().replace(/ /g, "-"),
          a = ["a", {href: "#" + id}, title],
          h1 = ["h1", {"class": "section-header"}, a];
      el.id = id;
      el.className = "section";
      contents.unshift(h1);
    break;
  }
  
  if (tag === "span") {
    el.innerText = contents[0];
  } else {
    contents = buildDoc(contents);
    for (var i = 0; i < contents.length; i++) {
      el.appendChild(contents[i]);
    }
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

var page = createElement([
  "div", {"class": "page"},
  ["div", {"class": "page-number"},
    ["a", {href: "#page-1", id: "page-1"}, "1"]]
]);

var firstPage = page.cloneNode(true);
document.body.appendChild(firstPage);

var sections = buildDoc(doc),
    height = 0,
    pageNo = 1,
    pageHeight = 9 * 96,
    currPage = firstPage,
    tableOfContents = [];

for (var i = 0; i < sections.length; i++) {
  var section = sections[i],
      header = section.getElementsByTagName("h1")[0],
      pageRemaining = pageHeight - height,
      startPage = pageNo;
  
  currPage.appendChild(section);
  
  var elHeight = section.getBoundingClientRect().height;
  
  if (elHeight > pageRemaining) {
    height = 0;
    pageNo++;
    
    var beforeBreak = section.cloneNode(true),
        newPage = page.cloneNode(true),
        pageLink = newPage.querySelector(".page-number a"),
        headerHeight = header.getBoundingClientRect().height;
    
    pageLink.innerText = pageNo;
    pageLink.href = "#page-" + pageNo;
    pageLink.id = "page-" + pageNo;
    
    if (pageRemaining >= headerHeight + 32) {
      // var children = [].slice.call(section.childNodes);
      // for (var j = 0; j < children.length; j++) {
      //   
      // }
      var cutOff = Math.floor((pageRemaining - headerHeight - 16) / 32) * 32 + headerHeight + 16;
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
    startPage = pageNo;
    height += elHeight;
  }
  
  tableOfContents.push([header.innerText, header.id, startPage]);
  
  currPage.appendChild(section);
}

var tableOfContentsPage = page.cloneNode(true);

document.body.insertBefore(tableOfContentsPage, firstPage);

for (i = 0; i < tableOfContents.length; i++) {
  var cont = tabletOfContents[i],
      sectionName = ["a", {href: "#" + cont[1]}, cont[0]],
      sectionPage = ["a", {href: "#page-" + cont[2]}, cont[2]],
      div = ["div", sectionName, " ", sectionPage];
  tableOfContentsPage.appendChild(createElement(div));
}
