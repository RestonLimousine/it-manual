function createElement (el) {
  if (el.constructor !== Array) el = ["span", el];
  
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

function parseNotation (start, text) {
  var tag,
      attrs = {},
      hrefPrefix = "",
      content = [],
      target = "__blank";
  switch (start) {
    case "[email:":
      hrefPrefix = "mailto:";
      target = "";
    case "[link:":
      tag = "a";
      text = text.trim();
      attrs.href = hrefPrefix + text;
      attrs.target = target;
      content = [text];
    break;
    case "*":
      tag = "b";
    case "/":
      tag = tag || "i";
      content = parseText(text);
    break;
  }
  return [tag, attrs].concat(content);
}

function parseText (text) {
  var specialStart = text.match(/\*|\/|\[link:|\[email:/),
      out = [text];
  if (specialStart) {
    specialStart = specialStart[0];
    var specialStartIdx = text.indexOf(specialStart),
        beforeSpecial = text.slice(0, specialStartIdx),
        specialEnds = {
          "*": "*",
          "/": "/",
          "[link:": "]",
          "[email:": "]"
        },
        specialEnd = specialEnds[specialStart],
        textChopped = text.slice(specialStartIdx + specialStart.length),
        specialEndIdx = textChopped.indexOf(specialEnd),
        afterSpecialIdx = specialEndIdx + specialEnd.length,
        special = textChopped.slice(0, specialEndIdx),
        afterSpecial = textChopped.slice(afterSpecialIdx);
    out = [];
    if (beforeSpecial.length > 0) out.push(beforeSpecial);
    out.push(parseNotation(specialStart, special));
    if (afterSpecial.length > 0) out = out.concat(parseText(afterSpecial));
  }
  return out;
}

function parseItem (item) {
  var tag, splitRe, listItems, el;
  switch (item[0]) {
    case "#":
      tag = "ol";
    case "-":
      tag = tag || "ul";
      var splitRe = new RegExp(item[0] + "+ ");
      splitRe = new RegExp("\\n" + item.match(splitRe)[0]);
      listItems = ("\n" + item).split(splitRe);
      el = [tag];
      for (var i = 1; i < listItems.length; i++) {
        var listItem = ["li"],
            content = listItems[i].split(/\n/);
        for (var j = 0; j < content.length; j++) {
          var thisContent = parseItem(content[j]);
          if (thisContent[0] === "p") {
            listItem = listItem.concat(thisContent.slice(1));
          } else {
            listItem.push(thisContent);
          }
        }
        el.push(listItem);
      }
    break;
    default:
      el = ["p"].concat(parseText(item));
  }
  return el;
}

function parseDoc (text) {
  var sections = text.split(/\n{4,}/),
      out = [];
  for (var i = 0; i < sections.length; i++) {
    var sectionSplit = sections[i].match(/(.+)\n\n([\s\S]+)/),
        header = sectionSplit[1],
        content = sectionSplit[2].split(/\n\n/),
        section = ["section", {title: header}];
    for (var j = 0; j < content.length; j++) {
      section.push(parseItem(content[j]));
    }
    out.push(section);
  }
  return out;
}

function buildManual (fileName, text) {

  document.body.innerHTML = "";

  var page = createElement([
    "div", {"class": "page"},
    ["div", {"class": "page-number"},
      ["a", {href: "#page-1", id: "page-1"}, "1"]]
  ]);

  var firstPage = page.cloneNode(true);
  document.body.appendChild(firstPage);

  var doc = parseDoc(text),
      sections = buildDoc(doc),
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
  
    var elHeight = section.offsetHeight;
    
    if (elHeight - 16 > pageRemaining) {
      
      height = 0;
      pageNo++;
    
      var beforeBreak = section.cloneNode(true),
          newPage = page.cloneNode(true),
          pageLink = newPage.querySelector(".page-number a"),
          headerHeight = header.offsetHeight;
    
      pageLink.innerText = pageNo;
      pageLink.href = "#page-" + pageNo;
      pageLink.id = "page-" + pageNo;
    
      if (pageRemaining >= headerHeight + 32) {
        var cutOff = headerHeight + 16;
        for (var j = 0; j < section.childNodes.length; j++) {
          var node = section.childNodes[j];
          cutOff += node.offsetHeight + 16;
          var diff = pageRemaining - cutOff;
          if (diff < 16) {
            cutOff -= Math.ceil(Math.abs(diff) / 32) * 32;
            break;
          }
        }
        beforeBreak.style.height = cutOff;
        currPage.appendChild(beforeBreak);
        section.style.height = elHeight - cutOff;
        section.style.display = "flex";
        section.style.flexDirection = "column";
        section.style.justifyContent = "flex-end";
        section.id = null;
      }
      currPage = newPage;
      document.body.appendChild(currPage);
    } else {
      startPage = pageNo;
      height += elHeight;
    }
  
    tableOfContents.push([header.innerText, section.id, startPage]);
  
    currPage.appendChild(section);
  }

  var pageloc = location.origin + location.pathname + location.search,
      tableOfContentsPage = createElement([
        "div", {class: "page"},
        ["h1", {class: "main-title"}, fileName],
        ["p", ["b", "Note: "],
              "If you are reading a PDF or printed version of this manual, " +
              "it may be out of date. The latest version can be found online at ",
          ["a", {href: pageloc, target: "__blank"}, pageloc]],
        ["h1", {class: "section-header"}, "Table Of Contents"]
      ]);

  document.body.insertBefore(tableOfContentsPage, firstPage);

  var heightUsed = 0;

  for (i = 0; i < tableOfContentsPage.childNodes.length; i++) {
    heightUsed += tableOfContentsPage.childNodes[i].getBoundingClientRect().height;
  }

  for (i = 0; i < tableOfContents.length; i++) {
    var cont = tableOfContents[i],
        sectionName = ["a", {href: "#" + cont[1]}, cont[0]],
        sectionPage = ["a", {href: "#page-" + cont[2]}, cont[2]],
        div = ["div", {class: "contents-listing"}, sectionName, sectionPage];
    div = createElement(div);
    tableOfContentsPage.appendChild(div);
    heightUsed += div.getBoundingClientRect().height;
  }
}

function fetchAndBuildManual (url) {
  var fileName = url.split(/\//).slice(-1)[0],
      req = new XMLHttpRequest();
  req.onload = function () {
    buildManual(decodeURI(fileName), this.responseText);
  };
  req.open("GET", url);
  req.send();
}
