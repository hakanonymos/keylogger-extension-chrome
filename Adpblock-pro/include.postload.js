/*
 * This file is part of Adblock Plus <https://adblockplus.org/>,
 * Copyright (C) 2006-2016 Eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

//
// This file has been generated automatically, relevant repositories:
// * https://hg.adblockplus.org/jshydra/
//

"use strict";
if ("ext" in window && document instanceof HTMLDocument)
{
  document.addEventListener("click", function(event)
  {
    if (event.button == 2)
    {
      return;
    }
    if (event.isTrusted == false)
    {
      return;
    }
    var link = event.target;
    while (!(link instanceof HTMLAnchorElement))
    {
      link = link.parentNode;
      if (!link)
      {
        return;
      }
    }
    var queryString = null;
    if (link.protocol == "http:" || link.protocol == "https:")
    {
      if (link.host == "subscribe.adblockplus.org" && link.pathname == "/")
      {
        queryString = link.search.substr(1);
      }
    }
    else
    {
      var match = /^abp:\/*subscribe\/*\?(.*)/i.exec(link.href);
      if (match)
      {
        queryString = match[1];
      }
    }
    if (!queryString)
    {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    var params = queryString.split("&");
    var title = null;
    var url = null;
    for (var i = 0; i < params.length; i++)
    {
      var parts = params[i].split("=", 2);
      if (parts.length != 2 || !/\S/.test(parts[1]))
      {
        continue;
      }
      switch (parts[0])
      {
      case "title":
        title = decodeURIComponent(parts[1]);
        break;
      case "location":
        url = decodeURIComponent(parts[1]);
        break;
      }
    }
    if (!url)
    {
      return;
    }
    if (!title)
    {
      title = url;
    }
    title = title.trim();
    url = url.trim();
    if (!/^(https?|ftp):/.test(url))
    {
      return;
    }
    ext.backgroundPage.sendMessage(
    {
      type: "subscriptions.add",
      title: title,
      url: url,
      confirm: true
    });
  }, true);
}
"use strict";
var blockelementPopupId = null;
var currentlyPickingElement = false;
var lastMouseOverEvent = null;
var currentElement = null;
var highlightedElementsSelector = null;
var highlightedElementsInterval = null;
var lastRightClickEvent = null;
var lastRightClickEventIsMostRecent = false;

function getFiltersForElement(element, callback)
{
  ext.backgroundPage.sendMessage(
  {
    type: "composer.getFilters",
    tagName: element.localName,
    id: element.id,
    src: element.getAttribute("src"),
    style: element.getAttribute("style"),
    classes: Array.prototype.slice.call(element.classList),
    urls: getURLsFromElement(element),
    mediatype: typeMap[element.localName],
    baseURL: document.location.href
  }, function(response)
  {
    callback(response.filters, response.selectors);
  });
}

function getBlockableElementOrAncestor(element, callback)
{
  while (element && element != document.documentElement && element != document.body)
  {
    if (!(element instanceof HTMLElement) || element.localName == "area")
    {
      element = element.parentElement;
    }
    else if (element.localName == "map")
    {
      var images = document.querySelectorAll("img[usemap]");
      var image = null;
      for (var i = 0; i < images.length; i++)
      {
        var usemap = images[i].getAttribute("usemap");
        var index = usemap.indexOf("#");
        if (index != -1 && usemap.substr(index + 1) == element.name)
        {
          image = images[i];
          break;
        }
      }
      element = image;
    }
    else
    {
      getFiltersForElement(element, function(filters)
      {
        if (filters.length > 0)
        {
          callback(element);
        }
        else
        {
          getBlockableElementOrAncestor(element.parentElement, callback);
        }
      });
      return;
    }
  }
  callback(null);
}

function addElementOverlay(element)
{
  var position = "absolute";
  var offsetX = window.scrollX;
  var offsetY = window.scrollY;
  for (var e = element; e; e = e.parentElement)
  {
    var style = getComputedStyle(e);
    if (style.display == "none")
    {
      return null;
    }
    if (style.position == "fixed")
    {
      position = "fixed";
      offsetX = offsetY = 0;
    }
  }
  var overlay = document.createElement("div");
  overlay.prisoner = element;
  overlay.className = "__adblockplus__overlay";
  overlay.setAttribute("style", "opacity:0.4; display:inline-box; " + "overflow:hidden; box-sizing:border-box;");
  var rect = element.getBoundingClientRect();
  overlay.style.width = rect.width + "px";
  overlay.style.height = rect.height + "px";
  overlay.style.left = rect.left + offsetX + "px";
  overlay.style.top = rect.top + offsetY + "px";
  overlay.style.position = position;
  overlay.style.zIndex = 2147483646;
  document.documentElement.appendChild(overlay);
  return overlay;
}

function highlightElement(element, shadowColor, backgroundColor)
{
  unhighlightElement(element);
  var highlightWithOverlay = function()
  {
    var overlay = addElementOverlay(element);
    if (!overlay)
    {
      return;
    }
    highlightElement(overlay, shadowColor, backgroundColor);
    overlay.style.pointerEvents = "none";
    element._unhighlight = function()
    {
      overlay.parentNode.removeChild(overlay);
    };
  };
  var highlightWithStyleAttribute = function()
  {
    var originalBoxShadow = element.style.getPropertyValue("box-shadow");
    var originalBoxShadowPriority = element.style.getPropertyPriority("box-shadow");
    var originalBackgroundColor = element.style.getPropertyValue("background-color");
    var originalBackgroundColorPriority = element.style.getPropertyPriority("background-color");
    element.style.setProperty("box-shadow", "inset 0px 0px 5px " + shadowColor, "important");
    element.style.setProperty("background-color", backgroundColor, "important");
    element._unhighlight = function()
    {
      element.style.removeProperty("box-shadow");
      element.style.setProperty("box-shadow", originalBoxShadow, originalBoxShadowPriority);
      element.style.removeProperty("background-color");
      element.style.setProperty("background-color", originalBackgroundColor, originalBackgroundColorPriority);
    };
  };
  if ("prisoner" in element)
  {
    highlightWithStyleAttribute();
  }
  else
  {
    highlightWithOverlay();
  }
}

function unhighlightElement(element)
{
  if (element && "_unhighlight" in element)
  {
    element._unhighlight();
    delete element._unhighlight;
  }
}

function highlightElements(selectorString)
{
  unhighlightElements();
  var elements = Array.prototype.slice.call(document.querySelectorAll(selectorString));
  highlightedElementsSelector = selectorString;
  highlightedElementsInterval = setInterval(function()
  {
    if (elements.length > 0)
    {
      var element = elements.shift();
      if (element != currentElement)
      {
        highlightElement(element, "#fd6738", "#f6e1e5");
      }
    }
    else
    {
      clearInterval(highlightedElementsInterval);
      highlightedElementsInterval = null;
    }
  }, 0);
}

function unhighlightElements()
{
  if (highlightedElementsInterval)
  {
    clearInterval(highlightedElementsInterval);
    highlightedElementsInterval = null;
  }
  if (highlightedElementsSelector)
  {
    Array.prototype.forEach.call(document.querySelectorAll(highlightedElementsSelector), unhighlightElement);
    highlightedElementsSelector = null;
  }
}

function stopEventPropagation(event)
{
  event.stopPropagation();
}

function mouseOver(event)
{
  lastMouseOverEvent = event;
  getBlockableElementOrAncestor(event.target, function(element)
  {
    if (event == lastMouseOverEvent)
    {
      lastMouseOverEvent = null;
      if (currentlyPickingElement)
      {
        if (currentElement)
        {
          unhighlightElement(currentElement);
        }
        if (element)
        {
          highlightElement(element, "#d6d84b", "#f8fa47");
        }
        currentElement = element;
      }
    }
  });
  event.stopPropagation();
}

function mouseOut(event)
{
  if (!currentlyPickingElement || currentElement != event.target)
  {
    return;
  }
  unhighlightElement(currentElement);
  event.stopPropagation();
}

function keyDown(event)
{
  if (!event.ctrlKey && !event.altKey && !event.shiftKey)
  {
    if (event.keyCode == 13)
    {
      elementPicked(event);
    }
    else if (event.keyCode == 27)
    {
      deactivateBlockElement();
    }
  }
}

function startPickingElement()
{
  currentlyPickingElement = true;
  Array.prototype.forEach.call(document.querySelectorAll("object,embed,iframe,frame"), function(element)
  {
    getFiltersForElement(element, function(filters)
    {
      if (filters.length > 0)
      {
        addElementOverlay(element);
      }
    });
  }.bind(this));
  document.addEventListener("mousedown", stopEventPropagation, true);
  document.addEventListener("mouseup", stopEventPropagation, true);
  document.addEventListener("mouseenter", stopEventPropagation, true);
  document.addEventListener("mouseleave", stopEventPropagation, true);
  document.addEventListener("mouseover", mouseOver, true);
  document.addEventListener("mouseout", mouseOut, true);
  document.addEventListener("click", elementPicked, true);
  document.addEventListener("contextmenu", elementPicked, true);
  document.addEventListener("keydown", keyDown, true);
  ext.onExtensionUnloaded.addListener(deactivateBlockElement);
}

function elementPicked(event)
{
  if (!currentElement)
  {
    return;
  }
  var element = currentElement.prisoner || currentElement;
  getFiltersForElement(element, function(filters, selectors)
  {
    if (currentlyPickingElement)
    {
      stopPickingElement();
    }
    ext.backgroundPage.sendMessage(
    {
      type: "composer.openDialog"
    }, function(popupId)
    {
      ext.backgroundPage.sendMessage(
      {
        type: "forward",
        targetPageId: popupId,
        payload: {
          type: "composer.dialog.init",
          filters: filters
        }
      });
      if (window == window.top)
      {
        blockelementPopupId = popupId;
      }
      else
      {
        ext.backgroundPage.sendMessage(
        {
          type: "forward",
          payload: {
            type: "composer.content.dialogOpened",
            popupId: popupId
          }
        });
      }
    });
    if (selectors.length > 0)
    {
      highlightElements(selectors.join(","));
    }
    highlightElement(currentElement, "#fd1708", "#f6a1b5");
  }.bind(this));
  event.preventDefault();
  event.stopPropagation();
}

function stopPickingElement()
{
  currentlyPickingElement = false;
  document.removeEventListener("mousedown", stopEventPropagation, true);
  document.removeEventListener("mouseup", stopEventPropagation, true);
  document.removeEventListener("mouseenter", stopEventPropagation, true);
  document.removeEventListener("mouseleave", stopEventPropagation, true);
  document.removeEventListener("mouseover", mouseOver, true);
  document.removeEventListener("mouseout", mouseOut, true);
  document.removeEventListener("click", elementPicked, true);
  document.removeEventListener("contextmenu", elementPicked, true);
  document.removeEventListener("keydown", keyDown, true);
}

function deactivateBlockElement()
{
  if (currentlyPickingElement)
  {
    stopPickingElement();
  }
  if (blockelementPopupId != null)
  {
    ext.backgroundPage.sendMessage(
    {
      type: "forward",
      targetPageId: blockelementPopupId,
      payload: {
        type: "composer.dialog.close"
      }
    });
    blockelementPopupId = null;
  }
  lastRightClickEvent = null;
  if (currentElement)
  {
    unhighlightElement(currentElement);
    currentElement = null;
  }
  unhighlightElements();
  var overlays = document.getElementsByClassName("__adblockplus__overlay");
  while (overlays.length > 0)
  {
    overlays[0].parentNode.removeChild(overlays[0]);
  }
  ext.onExtensionUnloaded.removeListener(deactivateBlockElement);
}
if ("ext" in window && document instanceof HTMLDocument)
{
  document.addEventListener("contextmenu", function(event)
  {
    lastRightClickEvent = event;
    lastRightClickEventIsMostRecent = true;
    ext.backgroundPage.sendMessage(
    {
      type: "forward",
      payload: {
        type: "composer.content.clearPreviousRightClickEvent"
      }
    });
  }, true);
  ext.onMessage.addListener(function(msg, sender, sendResponse)
  {
    switch (msg.type)
    {
    case "composer.content.getState":
      if (window == window.top)
      {
        sendResponse(
        {
          active: currentlyPickingElement || blockelementPopupId != null
        });
      }
      break;
    case "composer.content.startPickingElement":
      if (window == window.top)
      {
        startPickingElement();
      }
      break;
    case "composer.content.contextMenuClicked":
      var event = lastRightClickEvent;
      deactivateBlockElement();
      if (event)
      {
        getBlockableElementOrAncestor(event.target, function(element)
        {
          if (element)
          {
            currentElement = element;
            elementPicked(event);
          }
        });
      }
      break;
    case "composer.content.finished":
      if (currentElement && msg.remove)
      {
        checkCollapse(currentElement.prisoner || currentElement);
        updateStylesheet();
      }
      deactivateBlockElement();
      break;
    case "composer.content.clearPreviousRightClickEvent":
      if (!lastRightClickEventIsMostRecent)
      {
        lastRightClickEvent = null;
      }
      lastRightClickEventIsMostRecent = false;
      break;
    case "composer.content.dialogOpened":
      if (window == window.top)
      {
        blockelementPopupId = msg.popupId;
      }
      break;
    case "composer.content.dialogClosed":
      if (window == window.top && blockelementPopupId == msg.popupId)
      {
        ext.backgroundPage.sendMessage(
        {
          type: "forward",
          payload: {
            type: "composer.content.finished"
          }
        });
      }
      break;
    }
  }.bind(this));
  if (window == window.top)
  {
    ext.backgroundPage.sendMessage(
    {
      type: "composer.ready"
    });
  }
}
