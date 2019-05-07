function createElement (el) {
  if (el.constructor !== Array) el = ["span", el];
  
  var tag = el[0],
      contents = el.slice(1),
      attrs = {};
  
  if (contents[0].constructor === Object) {
    attrs = contents[0];
    contents = contents.slice(1);
  }
  
  el = document.createElement(tag);
  
  for (var prop in attrs) {
    el.setAttribute(prop, attrs[prop]);
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
      target = "_blank";
  switch (start) {
    case "[email:":
      hrefPrefix = "mailto:";
      target = "";
    case "[goto:":
      target = "";
      hrefPrefix = "#";
      // To Do: get section id from name
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
  var specialStart = text.match(/\*|\/|\[\w+:/),
      out = [text];
  if (specialStart) {
    specialStart = specialStart[0];
    var specialStartIdx = text.indexOf(specialStart),
        beforeSpecial = text.slice(0, specialStartIdx),
        specialEnds = {
          "*": "*",
          "/": "/",
          "[link:": "]",
          "[email:": "]",
          "[goto:": "]"
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
  var el = ["table", {class: "content-table"}, ["tbody"]],
      match = item.match(/^(\s*)(#|-)/),
      indent = match[1];
  el.listStart = match[2];
  if (el.listStart) {
    var splitRe = new RegExp("\\n" + indent + el.listStart),
        listItems = ("\n" + item).split(splitRe);
    for (var i = 1; i < listItems.length; i++) {
      var bullet = el.listStart === "#" ? i : "\u2022",
          newRow = ["tr", ["td", bullet]],
          newIndent = indent + "  ",
          newSplitRe = new RegExp("\\n" + newIndent),
          lines = listItems[i].split(newSplitRe),
          lastItem = [];
      for (var j = 0; j < lines.length; j++) {
        var line = parseItem(lines[j]);
        if (lastItem.listStart === line.listStart) {
          lastItem[2].push(line[2][1]);
        } else if (line.listStart) {
          lastItem = line;
          newRow.push(line);
        } else {
          newRow.push(line);
        }
      }
      el[2].push(newRow);
    }
  } else {
    el[2].push(["div"].concat(parseText(item)));
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
        id = header.toLowerCase().replace(/ /g, "-"),
        a = ["a", {href: "#" + id}, header],
        h1 = ["h1", {"class": "section-header"}, a],
        section = ["div", {id: id, class: "section"}, h1];
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
      ["a", {href: "#page-1", id: "page-1"}, "1"]],
    ["div", {class: "content"}]
  ]);

  var firstPage = page.cloneNode(true);
  document.body.appendChild(firstPage);

  var doc = parseDoc(text),
      sections = buildDoc(doc),
      currHeight = 0,
      pageNo = 1,
      pageHeight = 9 * 96,
      currPage = firstPage.getElementsByClassName("content")[0],
      tableOfContents = [];

  for (var i = 0; i < sections.length; i++) {
    
    var section = sections[i],
        header = section.getElementsByTagName("h1")[0],
        pageRemaining = pageHeight - currHeight,
        startPage = pageNo,
        sectionId = section.id;
  
    currPage.appendChild(section);
  
    var sectionHeight = section.offsetHeight;
    
    if (sectionHeight > pageRemaining) {
    
      var beforeBreak = section.cloneNode(true),
          newPage = page.cloneNode(true),
          pageLink = newPage.querySelector(".page-number a"),
          headerHeight = header.offsetHeight;
      
      pageNo++;
      pageLink.innerText = pageNo;
      pageLink.href = "#page-" + pageNo;
      pageLink.id = "page-" + pageNo;
      
      document.body.appendChild(newPage);
      currPage = newPage.getElementsByClassName("content")[0];
      
      if (headerHeight > pageRemaining) {
        currPage.appendChild(section);
      } else {
        for (var j = 1; j < section.childNodes.length; j++) {
          var child = section.childNodes[j];
          if (child.offsetHeight > pageRemaining) {
            
          } else {
            currHeight += child.offsetHeight;
            pageRemaining -= child.offsetHeight;
          }
        }
      }
      
      /*
      height = 0;
      
      if (pageRemaining >= headerHeight + 32) {
        var cutOff = headerHeight;
        for (var j = 1; j < section.childNodes.length; j++) {
          var node = section.childNodes[j];
          cutOff += node.offsetHeight + 16;
          var diff = pageRemaining - cutOff;
          if (diff < -16) {
            cutOff -= Math.ceil((Math.abs(diff) - 16) / 32) * 32;
            break;
          }
        }
        var cutOffDiff = sectionHeight - cutOff;
        currPage.appendChild(beforeBreak);
        if (beforeBreak.style.height) {
          var beforeBreakHeight = beforeBreak.offsetHeight;
          currPage.style.height = cutOff;
        } else {
          beforeBreak.style.height = cutOff;
        }
        section.style.height = cutOffDiff;
        section.style.display = "flex";
        section.style.flexDirection = "column";
        section.style.justifyContent = "flex-end";
        section.id = "";
        sections = sections.slice(0, i + 1).concat([section]).concat(sections.slice(i + 1));
      }
      currPage = newPage.getElementsByClassName("content")[0];
      document.body.appendChild(newPage);
    } else {
      height += sectionHeight;
    }
    */
  
    if (sectionId) tableOfContents.push([header.innerText, sectionId, startPage]);
      
    }
    // currPage.appendChild(section);
  }

  var pageloc = location.origin + location.pathname + location.search,
      tableOfContentsPage = createElement([
        "div", {class: "page"},
        ["h1", {class: "main-title"}, fileName],
        ["p", ["b", "Note: "],
              "If you are reading a PDF or printed version of this manual, " +
              "it may be out of date. The latest version can be found online at ",
          ["a", {href: pageloc, target: "_blank"}, pageloc]],
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
