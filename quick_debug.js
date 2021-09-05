const makeTitle = (text) => {
    var title = text.split(/[\n\!\?]/)[0];
    title = replaceEmojis(title)
    var newTitle = "";
    if (text != title) {
      title = title.slice(0, 100);
      if (title.search("http") != -1 || title.search("mailto") != -1) {
        var regex = new RegExp(/[\<\>]/);
        var split = title.split(regex);
  
        console.log(split)
        split.forEach((line) => {
          if (line.search("http") != -1 || line.search("mailto") != -1) {
            let lineSplit = line.split("|");
            console.log(lineSplit)
            newTitle += lineSplit[1];
          } else {
            newTitle += line;
          }
        });
      }
    } else {
      newTitle = title;
    }
    newTitle = newTitle.split(".")
    return newTitle[0];
  };

