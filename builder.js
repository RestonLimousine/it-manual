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
    el.textContent = contents[0];
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
    var el = createElement(els[i]);
    accum = accum.concat([el]);
  }
  return accum;
}

function parseNotation (start, text) {
  var tag,
      attrs = {},
      hrefPrefix = "",
      content = [text],
      target = "_blank";
  switch (start) {
    case "[goto:":
      attrs.class = "goto-link";
    case "[email:":
      hrefPrefix = hrefPrefix || "mailto:";
    case "[phone:":
      hrefPrefix = hrefPrefix || "tel:";
      target = "";
    case "[link:":
      tag = "a";
      text = text.trim();
      attrs.href = hrefPrefix + text;
      attrs.target = target;
    break;
    case "[subsection:":
      tag = "b";
      attrs.class = "subsection-link";
    break;
    case "*":
      tag = "b";
    case "/":
      tag = tag || "i";
      content = parseText(text);
    break;
    case "{":
      tag = "span";
    break;
  }
  return [tag, attrs].concat(content);
}

function parseText (text) {
  var specialStart = text.match(/\*|\/|\[\w+:|\{/),
      out = [text];
  if (specialStart) {
    specialStart = specialStart[0];
    var specialStartIdx = text.indexOf(specialStart),
        beforeSpecial = text.slice(0, specialStartIdx),
        specialEnds = {
          "*": "*",
          "/": "/",
          "[": "]",
          "{": "}"
        },
        specialEnd = specialEnds[specialStart[0]],
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
      match = item.match(/^(\s*)(#|-)/);
  if (match) {
    var isOL = match[2] === "#";
    el[1].class += " " + (isOL? "ol" : "-");
    el.listStart = match[2];
    var indent = match[1],
        splitRe = new RegExp("\\n" + indent + match[2]),
        listItems = ("\n" + item).split(splitRe);
    for (var i = 1; i < listItems.length; i++) {
      var td = ["td", {class: "content-td"}],
          bullet = isOL ? (i + ".") : "\u2022",
          bulletTd = ["td", {class: "bullet-td"}, bullet],
          newRow = ["tr", {class: "listing-row"}, bulletTd, td],
          newIndent = indent + "  ",
          newSplitRe = new RegExp("\\n" + newIndent),
          lines = listItems[i].split(newSplitRe),
          lastItem = {listStart: {}};
      for (var j = 0; j < lines.length; j++) {
        var line = parseItem(lines[j]);
        if (lastItem.listStart === line.listStart) {
          if (line.listStart === "#")
            line[2][1][2][2] = j + lastItem.startNum + ".";
          lastItem[2].push(line[2][1]);
        } else if (line.listStart) {
          lastItem = line;
          lastItem.startNum = j;
          td.push(line);
        } else {
          td.push(line);
        }
      }
      el[2].push(newRow);
    }
  } else {
    var parsed = parseText(item);
    el[2].push(["tr", ["td"].concat(parsed)]);
  }
  return el;
}

function headerToId (header) {
  return header.toLowerCase().replace(/ /g, "-");
}

function parseDoc (text) {
  var sections = text.split(/\n{4,}/),
      out = [];
  for (var i = 0; i < sections.length; i++) {
    var sectionSplit = sections[i].match(/(.+)\n\n([\s\S]+)/),
        header = sectionSplit[1],
        content = sectionSplit[2].split(/\n\n/),
        id = headerToId(header),
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
      currPage = firstPage.getElementsByClassName("content")[0],
      pageHeight = currPage.offsetHeight,
      tableOfContents = [];

  for (var i = 0; i < sections.length; i++) {
    
    var section = sections[i],
        header = section.getElementsByTagName("h1")[0],
        pageRemaining = pageHeight - currHeight,
        startPage = pageNo,
        sectionId = section.id;
    
    currPage.appendChild(section);
    
    section.dataset.page = pageNo;
    
    var sectionHeight = section.offsetHeight;
    
    if (sectionHeight > pageRemaining) {
    
      var newPage = page.cloneNode(true),
          pageLink = newPage.querySelector(".page-number a");
      
      pageNo++;
      pageLink.textContent = pageNo;
      pageLink.href = "#page-" + pageNo;
      pageLink.id = "page-" + pageNo;
      
      document.body.appendChild(newPage);
      
      currPage = newPage.getElementsByClassName("content")[0];
      
      var atLeastOneLine = false,
          newSection = createElement(["div", {class: "section"}]);
      
      newSection.dataset.page = pageNo;
      
      (function truncateChildren (el, elClone) {
        var childNodes = el.childNodes,
            child = childNodes[childNodes.length - 1],
            clone = child.cloneNode();
        elClone.insertBefore(clone, elClone.childNodes[0]);
        if (child.tagName === "SPAN") {
          while (section.offsetHeight > pageRemaining) {
            var text = child.textContent,
                _split = text.match(/^(.*)([ \-][^ \-]*)$/),
                split = _split || ["", "", text];
            child.textContent = split[1];
            clone.textContent = split[2] + clone.textContent;
            if (child.textContent === "") {
              child.remove();
              break;
            }
          }
          if (child.textContent !== "") {
            atLeastOneLine = true;
            clone.classList.remove("start-num");
          }
        } else {
          if (section.offsetHeight > pageRemaining && child.childNodes.length > 0) {
            truncateChildren(child, clone);
          }
          
          if (child.childNodes.length === 0) {
            child.remove();
          } else if (child.classList.contains("listing-row")) {
            var bulletTd = child.getElementsByClassName("bullet-td")[0],
                bulletClone = bulletTd.cloneNode(),
                cloneFirstChild = clone.childNodes[0];
            clone.insertBefore(bulletClone, cloneFirstChild);
            bulletClone.style.width = getComputedStyle(bulletTd).width;
          }
        }
        
        if (section.offsetHeight > pageRemaining && el.childNodes.length > 0) truncateChildren(el, elClone);
        
      })(section, newSection);
    
      sections = sections.slice(0, i + 1).concat([newSection]).concat(sections.slice(i + 1));
      currHeight = 0;
    
    } else {
    
      currHeight += section.offsetHeight;
      
    }
    
    if (sectionId) tableOfContents.push([header.textContent, sectionId, startPage]);
  }
  
  sections = document.body.getElementsByClassName("section");
  
  for (var i = 0, j = -1; i < sections.length; i++) {
    var section = sections[i],
        pageNo = section.dataset.page,
        subsections = section.getElementsByClassName("subsection-link");
    if (section.id) j++;
    for (var k = 0; k < subsections.length; k++) {
      var header = subsections[k].textContent,
          id = headerToId(header);
      subsections[k].id = id;
      tableOfContents[j].push([header, id, pageNo]);
    }
  }

  var pageloc = location.origin + location.pathname + location.search,
      tableOfContentsPage = createElement([
        "div", {class: "page"},
        ["div", {class: "content"},
          ["h1", {class: "main-title"}, fileName],
          ["p", ["b", "Note: "],
                "If you are reading a PDF or printed version of this manual, " +
                "it may be out of date. The latest version can be found online at ",
            ["a", {href: pageloc, target: "_blank"}, pageloc]],
          ["h1", {class: "section-header"}, "Table Of Contents"]]
      ]);

  document.body.insertBefore(tableOfContentsPage, firstPage);

  var heightUsed = 0;
  
  tableOfContentsPage = tableOfContentsPage.getElementsByClassName("content")[0];

  for (i = 0; i < tableOfContentsPage.childNodes.length; i++) {
    heightUsed += tableOfContentsPage.childNodes[i].offsetHeight;
  }
  
  var gotoLinks = document.body.getElementsByClassName("goto-link");
  
  function makeContentsListing (cont) {
    var sectionName = ["a", {href: "#" + cont[1]}, cont[0]],
        sectionPage = ["a", {href: "#page-" + cont[2]}, cont[2]],
        div = ["div", {class: "contents-listing"}, sectionName, sectionPage];
    div = createElement(div);
    tableOfContentsPage.appendChild(div);
    return div;
  }

  for (i = 0; i < tableOfContents.length; i++) {
    var cont = tableOfContents[i],
        div = makeContentsListing(cont);
    heightUsed += div.offsetHeight;
    for (var j = 0; j < gotoLinks.length; j++) {
      if (gotoLinks[j].textContent.trim() === cont[0].trim()) {
        gotoLinks[j].href = "#" + cont[1];
        gotoLinks[j].classList.remove("goto-link");
        j--;
      }
    }
    for (var k = 3; k < cont.length; k++) {
      div = makeContentsListing(cont[k]);
      div.classList.add("subsection-contents-listing");
    }
  }
  
  if (gotoLinks.length > 0) {
    throw "Section not found: " + gotoLinks[0].textContent.trim();
  }
}

function fetchAndBuildManual (url) {
  var fileName = url.split(/\//).slice(-1)[0],
      req = new XMLHttpRequest();
  req.onload = function () {
    buildManual(decodeURI(fileName), this.responseText);
    var hash = location.hash;
    location.hash = "";
    location.hash = hash;
  };
  req.open("GET", url);
  req.send();
}
