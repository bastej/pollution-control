require("./css/style.scss");
require("./favicon.ico");
// import $ from 'jquery';
import map from 'lodash/map';

document.addEventListener("DOMContentLoaded", function(event) {
  
  document.querySelector("#country-search").addEventListener("submit", async (e)  => {
    e.preventDefault();    

    const country = document.querySelector("#country-name").value;

    //validate form
    if(!validateForm(e.target)) {
      return false
    }

    const countrySlug = await UI.convertToSlug(country);
    // alert(countrySlug);

    const cities = await OpenAQService.getCities(countrySlug);
    // console.log("powyzej sa cities")

    const citiesInfo = await WikiService.getCitiesInfo(cities);

    UI.renderCities(citiesInfo);
    // console.log("test1: ", citiesInfo);
  });

//form validation obj
function validateForm(form) {
  var fields = form.querySelectorAll("[required]");
  var errors = [];
  var formValid = validate(errors);
  function validate(errors) {
    //IE support
    for (var i = 0; i < fields.length; i++) {
      validateField(fields[i], errors);
    }
    return !errors.length;
  }
  function validateField(field, errors) {
    var fieldValid = field.validity.valid;
    if (fieldValid) {
      // field.nextSibling.nextSibling.innerHTML = "";
      field.classList.remove("invalid");
    } else {
      // field.nextSibling.nextSibling.innerHTML = field.dataset.errorMessage;
      console.log(field.dataset.errorMessage);
      field.classList.add("invalid");
      errors.push(field.dataset.errorMessage);
    }
  }
  if (formValid) {
    return true;
  } else {
    return false;
  }
}

 var UI = (function(app){

    //render items in DOM
    app.renderCities = cities => {
      const container = document.querySelector("#cities-list");

      //use lodash map iterate through objects collection
      map(cities, city => {
        let item = document.createElement("p");
        item.innerHTML += `${city.title}<br/> ${city.extract || "Lorem Ipsum"}`
        container.appendChild(item);
      })
    }
    
    app.convertToSlug = (countryName) => {
      
      const slugStorage = {
        "PL": "Poland",
        "DE": "Germany",
        "ES": "Spain",
        "FR": "France",
      }
      return new Promise(resolve => {
        resolve(
            Object.keys(slugStorage).find(key => slugStorage[key] === countryName)
        )
      });
    }

    return app
  })(UI || {});
  
  //help to fetch data with jsonp from API that don't support CORS
  const loadJSONP = (function(){
    return function(url, callback, config) {
      // INIT
      const name = "_jsonp_" + Math.floor(Date.now() / 100);
      let params;
      //
      if(Object.keys(config).length) {
        let checkedConfig = {...config, format: "json"};//check json format exist
        console.log(checkedConfig);
        params = Object.keys(checkedConfig).reduce(
          (newArr, key) => {
            newArr.push(key+'='+encodeURIComponent(checkedConfig[key]));
            return newArr
          },[]).join("&")
      }
      //check if url already contain any parameter
      if (url.match(/\?/)) url += `${params || ""}&callback=${name}`; 
      else url += `?${params+"&" || ""}callback=${name}`;

      // Create script
      let script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = url;
      // Setup handler
      window[name] = function(data){
        //set this to window object, pass data
        callback.call(window, data);
        document.getElementsByTagName('head')[0].removeChild(script);
        script = null;
        delete window[name];
      };
      // Load JSON, set to first position to easy pick up when deleting
      document.getElementsByTagName('head')[0].appendChild(script);
    };
  })();

  const WikiService = (function(service) {

    service.getCitiesInfo = citiesArr => {
      
        const titles = citiesArr.join("|");

        const config = {
          action: "query",
          prop: "extracts",
          exintro: true,
          titles, 
        }

        return new Promise(resolve => {

          loadJSONP(
            "https://en.wikipedia.org/w/api.php",
            function(data) {
              console.log("this: ", this === window)
              console.log(data.query.pages);
              resolve(data.query.pages);
            },
            config
          );

          // or just use ajax
          // $.ajax({
          //   url: 'http://en.wikipedia.org/w/api.php',
          //   data: {
          //     action: 'query',
          //     prop: 'info',
          //     titles: "Katowice|Opole",
          //     format:'json'
          //   },
          //   dataType:'jsonp',
          //   success: function(data) {
          //     console.log(data);
          //   }
          //   });


            // const citiesString = encodeURI(citiesArr.join("|"));
            // var citiesInfo = fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&exintro=true&titles=Katowice|Opole`)
            // .then(
            //   results => console.log("wiki:", results)
            // )

        })
    }
    return service
  })(WikiService || {})

  const OpenAQService = (function(service) {

    service.getCities = async (country) => {
      const citiesArr = [];
      return new Promise(resolve => {
        // Fetch data
        var cities = fetch(`https://api.openaq.org/v1/latest?country=${country}&parameter=pm25`)
        // Parse JSON response
        .then(response => response.json())
        // Sort from the largest by value of first measurement 
        .then(response => response.results.sort((a, b) => b.measurements[0].value - a.measurements[0].value))
        // Make results unique by city
        .then(results => Object.values(
          results.reduce((uniqueResults, result) => {
            if (uniqueResults[result.city] === undefined) {
              uniqueResults[result.city] = result
            }
            return uniqueResults
          }, {})
        ))
        // Slice results to 10, because we want only 10 cities
        .then(results => results.slice(0, 10))
        // List results
        .then(results => {
          results.map((result) => {
            citiesArr.push(result.city)
          })
          console.log(results);
          console.log(citiesArr)
        }).then(
          () => resolve(citiesArr)
        )
      })
    } 
    return service
  })(OpenAQService || {})

})
